/*

index.js - "gossipmonger": Gossip protocol endpoint for real-time peer-to-peer replication

The MIT License (MIT)

Copyright (c) 2013 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/
"use strict";

var events = require('events'),
    Peer = require('gossipmonger-peer'),
    util = require('util');

/*
  * `peerInfo`: _Object_
    * `data`: _Object_ _(Default: {})_ A map of key, [value, version] pairs to 
            store for this peer. 
    * `id`: _String_ Id of this peer.      
    * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating
            the last version of the version of the last change of this peer.
    * `transport`: _Any_ Any data identifying this peer to the transport 
            mechanism that is required for correct transport operation.            
  * `options`: _Object_
    * `DEAD_PEER_PHI`: _Integer_ _(Default: 8)_ Phi accrual failure detector value
            that when exceeded assumes the corresponding peer is dead.
    * `GOSSIP_INTERVAL`: _Integer_ _(Default: 1000)_ Number of milliseconds
            between gossip attempts.
    * `MAX_DELTAS_PER_GOSSIP`: _Integer_ _(Default: 5)_ The maximum number of deltas
            to include in a gossip.
    * `MINIMUM_LIVE_PEERS`: _Integer_ _(Default: 1)_ If the number of live peers visible
            to this peer drops below `MINIMUM_LIVE_PEERS`, this peer will make sure
            to gossip with one of the seeds even if it thinks it's dead.
    * `seeds`: _Array_ _(Default: [])_ An array of seed peers that the `transport`
            understands.
    * `storage`: _Object_ _(Default: `gossipmonger-memory-storage`)_ An 
            initialized and ready to use storage module for storing local and 
            peer data that conforms to the Gossipmonger Storage Protocol. If 
            `storage` is not provided, a new instance of `gossipmonger-memory-storage` 
            will be created and used with default settings.
    * `transport`: _Object_ _(Default: `gossipmonger-tcp-transport`)_ An 
            initialized and ready to use transport module for sending 
            communications that conforms to the Gossipmonger Transport Protocol. 
            If `transport` is not provided, a new instance of `gossipmonger-tcp-transport` 
            will be created and used with default settings.
*/
var Gossipmonger = module.exports = function Gossipmonger (peerInfo, options) {
    var self = this;
    events.EventEmitter.call(self);

    options = options || {};

    self.localPeer = new Peer(peerInfo.id, peerInfo);

    self.DEAD_PEER_PHI = options.DEAD_PEER_PHI || 8;
    self.GOSSIP_INTERVAL = options.GOSSIP_INTERVAL || 1000;
    self.MAX_DELTAS_PER_GOSSIP = options.MAX_DELTAS_PER_GOSSIP || 5;
    self.MINIMUM_LIVE_PEERS = options.MINIMUM_LIVE_PEERS || 1;
    self.seeds = options.seeds || [];
    self.storage = options.storage;
    if (!self.storage) {
        var MemoryStorage = require('gossipmonger-memory-storage');
        self.storage = new MemoryStorage();
    }
    self.transport = options.transport;
    if (!self.transport) {
        var TcpTransport = require('gossipmonger-tcp-transport');
        self.transport = new TcpTransport();
    }

    /*
      * `remotePeer`: _Object_
        * `id`: _String_ Id of the peer.
        * `transport`: _Any_ Any data identifying this peer to the transport 
                mechanism that is required for correct transport operation.    
      * `deltas`: _Array_ An array of deltas to update local knowledge with.
              Each delta is of the form: [peerId, key, value, version].
    */
    self.transport.on('deltas', function (remotePeer, deltas) {
        self.emit('deltas receive', remotePeer, deltas);
        var remote = self.storage.get(remotePeer.id);

        if (!remote) {
            remote = new Peer(remotePeer.id, {
                lastTime: new Date().getTime(), // first contact now
                transport: remotePeer.transport
            });
            self.emit('new peer', remote);
        } else {
            remote.markContact();
        }
        self.storage.put(remote.id, remote);

        // apply received deltas to local knowledge
        deltas.forEach(function (delta) {
            var id = delta.shift();
            var p = self.storage.get(id);
            if (!p) {
                self.emit('unknown peer', id);
                return; // unknown peer
            }

            // use apply to split the delta array into key, value, version params
            var key = p.updateWithDelta.apply(p, delta);

            // update storage if key was updated
            if (key) {                
                self.storage.put(p.id, p);
                // delta: [key, value, version]
                self.emit('update', p.id, delta[0], delta[1]);
            }
        });
    });

    /*
      * `remotePeer`: _Object_
        * `id`: _String_ Id of the peer.
        * `transport`: _Any_ Any data identifying this peer to the transport 
                mechanism that is required for correct transport operation.
      * `digest`: _Array_ An array of peer objects with `id`, `maxVersionSeen`, 
              and `transport` fields.
    */
    self.transport.on('digest', function (remotePeer, digest) {
        self.emit('digest receive', remotePeer, digest);
        var remote = self.storage.get(remotePeer.id);

        if (!remote) {
            remote = new Peer(remotePeer.id, {
                lastTime: new Date().getTime(), // first contact now
                transport: remotePeer.transport
            });
            self.emit('new peer', remote);
        } else {
            remote.markContact();
        }
        self.storage.put(remote.id, remote);

        // generate deltas to send to peer
        var candidateDeltas = [];
        digest.forEach(function (peer) {
            var p = self.storage.get(peer.id);
            
            if (!p) {
                // add previously unknown peer to our awareness
                p = new Peer(peer.id, peer);
                self.storage.put(peer.id, p);
                self.emit('new peer', p);
            }

            if (p.maxVersionSeen > peer.maxVersionSeen) {
                // we have more recent information about this peer
                // built up deltas to send over to remotePeer
                candidateDeltas.push({
                    peer: {
                        id: p.id
                    },
                    deltas: p.deltasAfterVersion(peer.maxVersionSeen)
                });
            }
        });

        // sort candidate deltas by most deltas
        // this results in us sending information about the most outdated peer
        // first
        candidateDeltas.sort(function (a, b) {
            return b.deltas.length - a.deltas.length;
        });

        var deltasToSend = [];
        // we use two MAX_DELTAS_PER_GOSSIP checks to circuitbreak at the first
        // point when we've done enough calculations to send max allowed deltas
        for (var i = 0; i < candidateDeltas.length; i++) {
            if (deltasToSend.length >= self.MAX_DELTAS_PER_GOSSIP)
                break;

            var candidate = candidateDeltas[i];
            
            // sort deltas by verison number
            // this results in us sending information about the oldest changes
            // prior to the newest changes (although only the most recent change
            // that has not yet been seen will be sent per each key, not the 
            // entire history of each key).
            candidate.deltas.sort(function (a, b) {
                return a[2] - b[2]; // ex delta: [key, value, version]
            });

            for (var j = 0; j < candidate.deltas.length; j++) {
                if (deltasToSend.length >= self.MAX_DELTAS_PER_GOSSIP)
                    break;

                var d = candidate.deltas[j];
                d.unshift(candidate.peer.id); // [peerId, key, value, version]
                deltasToSend.push(d);
            }
        }

        // respond to the peer with deltas
        self.emit('deltas send', remotePeer, deltasToSend);
        self.transport.deltas(remotePeer, self.localPeer, deltasToSend);
    });

    self.timeout = null;
};

util.inherits(Gossipmonger, events.EventEmitter);

/*
  * `livePeers`: _Array_ _(Default: [])_ An array of live peers.
  Return: _Array_ An array of peers with `maxVersionSeen` fields included.
*/
Gossipmonger.prototype.digest = function digest (livePeers) {
    var self = this;

    livePeers = livePeers || [];

    var result = [];
    livePeers.forEach(function (livePeer) {
        result.push({
            id: livePeer.id, 
            maxVersionSeen: livePeer.maxVersionSeen,
            transport: livePeer.transport
        });
    });

    // add self
    result.push({
        id: self.localPeer.id,
        maxVersionSeen: self.localPeer.maxVersionSeen,
        transport: self.localPeer.transport
    });

    return result;
};

Gossipmonger.prototype.gossip = function gossip () {
    var self = this;

    // gossip with live peers
    var livePeers = self.storage.livePeers();
    var digestToSend = self.digest(livePeers);
    if (livePeers.length > 0) {
        // select random live peer
        var livePeer = livePeers[Math.floor(Math.random() * livePeers.length)];
        self.emit('digest send', livePeer, digestToSend);
        self.transport.digest(livePeer, self.localPeer, digestToSend);
    }

    // maybe try to gossip with a dead peer
    var deadPeers = self.storage.deadPeers();
    var probability = deadPeers.length / (livePeers.length + 1);

    // do not go gently into that good night, gossip if no live peers seen!
    if (livePeers.length == 0)
        probability = 1;

    if (Math.random() < probability && deadPeers.length > 0) {
        // select random dead peer
        var deadPeer = deadPeers[Math.floor(Math.random() * deadPeers.length)];
        self.emit('digest send', deadPeer, digestToSend);
        self.transport.digest(deadPeer, self.localPeer, digestToSend);
    }

    // gossip to a seed if live peers are getting scarce
    if (livePeers.length < self.MINIMUM_LIVE_PEERS && self.seeds.length > 0) {
        // select random seed
        var seed = self.seeds[Math.floor(Math.random() * self.seeds.length)];
        self.emit('digest send', seed, digestToSend);
        self.transport.digest(seed, self.localPeer, digestToSend);
    }

    // update peer liveness
    livePeers.forEach(function (livePeer) {
        var phi = livePeer.phi();
        if (phi > self.DEAD_PEER_PHI || isNaN(phi)) {
            livePeer.markDead();
            self.storage.put(livePeer.id, livePeer); // commit to storage that peer is dead
            self.emit('peer dead', livePeer);
        }
    });
    deadPeers.forEach(function (deadPeer) {
        var phi = deadPeer.phi();
        if (phi < self.DEAD_PEER_PHI) {
            deadPeer.markLive();
            self.storage.put(deadPeer.id, deadPeer); // commit to storage that peer is live
            self.emit('peer live', deadPeer);
        }
    });

    // clean up timers in case gossip() is called multiple times
    if (self.timeout)
        clearTimeout(self.timeout);

    // go another round
    self.timeout = setTimeout(self.gossip.bind(self), self.GOSSIP_INTERVAL);
};

/*
  * `key`: _String_ Key to update.
  * `value`: _Any_ The value to update with.
*/
Gossipmonger.prototype.update = function update (key, value) {
    var self = this;

    self.localPeer.updateLocal(key, value);
};