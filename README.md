# gossipmonger

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/gossipmonger.png)](http://npmjs.org/package/gossipmonger)

Gossipmonger is an implementation of the Scuttlebutt gossip protocol endpoint for real-time peer-to-peer peer-state distribution.

## Usage

```javascript
var Gossipmonger = require('gossipmonger');

var gossipmonger = new Gossipmonger(
    { // peerInfo
        id: "localId",
        transport: {
            host: "localhost",
            port: 9742
        }
    },
    { // options
        seeds: [
            {id: "seed1", transport {...}},
            {id: "seed2", transport {...}},
            {id: "seed3", transport {...}}
        ]
    });

gossipmonger.on('new peer', function (newPeer) {
    console.log("found new peer " + newPeer.id " at " + newPeer.transport);
});

gossipmonger.on('peer dead', function (deadPeer) {
    console.log("peer " + deadPeer.id + " is now assumed unreachable");
});

gossipmonger.on('peer live', function (livePeer) {
    console.log("peer " + livePeer.id + " is live again");
});

gossipmonger.on('update', function (peerId, key, value) {
    console.log("peer " + peerId + " updated key " + key + " with " + value);
});

gossipmonger.gossip(); // start gossiping

gossipmonger.update('foo', 'bar');
// this node's foo/bar key value pair will now be gossiped 
//  to the rest of the cluster
```

## Tests

    npm test

## Overview

Gossipmonger is an implementation of the Scuttlebutt gossip protocol endpoint for real-time peer-to-peer peer-state distribution. Gossip protocols are used in a decentralized peer-to-peer manner in order to make every peer that is connected aware of the state of every other peer. The objective is to give every peer global awareness without a centralized server. This is accomplished by heuristically guided message passing between peers. 

### Peers

Gossipmonger manages information about _peers_ via maintaining peer information in a structure called a _peer_. A peer stores the details of a particular peer on the network, including the data necessary to estimate whether the peer is "alive" or "dead".

Peers are implemented internally as JavaScript objects, and most details are not necessary to be exposed, however when creating a new Gossipmonger, the following are required to be provided as `peerInfo` object:

  * `data`: _Object_ _(Default: {})_ A map of key, [value, version] pairs to store for this peer. 
  * `id`: _String_ Id of this peer.      
  * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating the last version of the version of the last change of this peer.
  * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.

All peer attributes are as implemented in [gossipmonger-peer](https://github.com/tristanls/gossipmonger-peer):

  * `data`: _Object_ _(Default: `{}`)_ Peer data.
  * `id`: _String_ Id of the peer.
  * `intervals`: _Array_ _(Default: [750])_ An array of the last (up to `MAX_INTERVALS`) intervals between times when the peer has been seen. 
  * `intervalsMean`: _Integer_ _(Default: undefined)_ Memoized intervals mean. 
  * `lastTime`: _Integer_ _(Default: undefined)_ The last time the peer has been seen (in milliseconds since midnight Jan 1, 1970).
  * `live`: _Boolean_ _(Default: true)_ Indicator whether or not the peer is thought to be live.
  * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating the last version of the peer that has been observed.
  * `MAX_INTERVALS`: _Integer_ _(Default: 100)_ The maximum number of intervals to keep in `intervals`.  
  * `sum`: _Integer_ _(Default: undefined)_ Memoized sum of intervals to make intervals mean calculation more efficient.          
  * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.

### Digests

Digests are passed around between peers to communicate what they know about all other peers and the latest version they have seen of those peers.

A digest is an array of peer objects, for example:

```javascript
[ 
    {
        id: "peer1", 
        maxVersionSeen: 1732, 
        transport: {
            host: "peer1.host", 
            port: 9742
        }
    },
    {
        id: "peer2", 
        maxVersionSeen: 1432, 
        transport: {
            host: "peer2.host", 
            port: 9742
        }
    }    
]
```

### Deltas

Deltas are passed around between peers in response to receiving a digest to update any information that (from the senders perspective) is out of date.

Deltas are an array of delta objects, for example:

```javascript
[
    ["peer1", "foo", "bar", 1732],
    ["peer1", "bas", "baz", 4322],
    ["peer2", "far", "blh", 422]
]
```

## Documentation

### Gossipmonger

**Public API**

  * [new Gossipmonger(peerInfo, \[options\])](#new-gossipmongerpeerinfo-options)
  * [gossipmonger.gossip()](#gossipmongergossip)
  * [gossipmonger.update(key, value)](#gossipmongerupdatekey-value)
  * [Event 'new peer'](#event-new-peer)
  * [Event 'peer dead'](#event-peer-dead)
  * [Event 'peer live'](#event-peer-live)
  * [Event 'update'](#event-update)

### new Gossipmonger(peerInfo, [options])

  * `peerInfo`: _Object_
    * `data`: _Object_ _(Default: {})_ A map of key, [value, version] pairs to store for this peer. 
    * `id`: _String_ Id of this peer.      
    * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating the last version of the version of the last change of this peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation. 
  * `options`: _Object_
    * `DEAD_PEER_PHI`: _Integer_ _(Default: 8)_ Phi accrual failure detector value that when exceeded assumes the corresponding peer is dead.
    * `GOSSIP_INTERVAL`: _Integer_ _(Default: 1000)_ Number of milliseconds between gossip attempts.
    * `MAX_DELTAS_PER_GOSSIP`: _Integer_ _(Default: 5)_ The maximum number of deltas to include in a gossip.
    * `MINIMUM_LIVE_PEERS`: _Integer_ _(Default: 1)_ If the number of live peers visible to this peer drops below `MINIMUM_LIVE_PEERS`, this peer will make sure to gossip with one of the seeds even if it thinks it's dead.
    * `seeds`: _Array_ _(Default: [])_ An array of seed peers that the `transport` understands.
    * `storage`: _Object_ _(Default: `gossipmonger-memory-storage`)_ An initialized and ready to use storage module for storing local and peer data that conforms to the Gossipmonger Storage Protocol. If `storage` is not provided, a new instance of `gossipmonger-memory-storage` will be created and used with default settings.
    * `transport`: _Object_ _(Default: `gossipmonger-tcp-transport`)_ An initialized and ready to use transport module for sending communications that conforms to the Gossipmonger Transport Protocol. If `transport` is not provided, a new instance of `gossipmonger-tcp-transport` will be created and used with default settings.

Creates a new Gossipmonger instance.

The `seeds` are necessary in order to bootstrap the gossip cluster. Gossipmonger will use these `seeds` to find out about other nodes and also as peers of last resort if all the peers appear to be dead.

### gossipmonger.digest(livePeers)

_**CAUTION: reserved for internal use**_

  * `livePeers`: _Array_ _(Default: [])_ An array of live peers.
  * Return: _Array_ An array of peers with `maxVersionSeen` fields included.

Creates a digest of peers that are thought to be "live" to send to another peer.

### gossipmonger.gossip()

Initiates gossip and will continue to gossip according to `GOSSIP_INTERVAL`.

The implemented algorithm does the following in order:

1. Select a random live peer (if any) and send my digest to the peer.
2. Maybe send my digest to a random dead peer (or do so for sure if all peers appear to be dead).
3. If number of live peers is below `MINIMUM_LIVE_PEERS` send my digest to a random seed.
4. Update my estimate of the liveness of all live peers.
5. Update my estimate of the deadness of all dead peers.
6. Set timeout to gossip again `GOSSIP_INTERVAL` from now.

### gossipmonger.update(key, value)

  * `key`: _String_ Key to update.
  * `value`: _Any_ The value to update with.

Updates the local peer's `key` with specified `value`.

### Event `deltas receive`

_**CAUTION: reserved for internal use**_

  * `function (remotePeer, deltas) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.    
    * `deltas`: _Array_ An array of deltas to update local knowledge with. Each delta is of the form: [peerId, key, value, version].

Emitted when Gossipmonger receives deltas from a remote peer.

### Event `deltas send`

_**CAUTION: reserved for internal use**_

  * `function (remotePeer, deltas) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.    
    * `deltas`: _Array_ An array of deltas to update local knowledge with. Each delta is of the form: [peerId, key, value, version].

Emitted when Gossipmonger sends deltas to a remote peer.

### Event `digest receive`

_**CAUTION: reserved for internal use**_

  * `function (remotePeer, digest) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
    * `digest`: _Array_ An array of peer objects with `id`, `maxVersionSeen`, and `transport` fields.

Emitted when Gossipmonger receives a digest from a remote peer.

### Event `digest send`

_**CAUTION: reserved for internal use**_

  * `function (remotePeer, digest) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
    * `digest`: _Array_ An array of peer objects with `id`, `maxVersionSeen`, and `transport` fields.

Emitted when Gossipmonger sends a digest to a remote peer.

### Event `new peer`

  * `function (newPeer) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.   

Emitted when Gosspimonger becomes aware of a new peer.

### Event `peer dead`

  * `function (deadPeer) {}`
    * `deadPeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.     

Emitted when Gossipmonger assumes that a live peer is now dead.

### Event `peer live`

  * `function (livePeer) {}`
    * `livePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation. 

Emitted when Gossipmonger assumes that a dead peer is now live.

### Event `unknown peer`

_**CAUTION: reserved for internal use**_

  * `function (peerId) {}`
    * `id`: _String_ Id of the unknown peer.    

Emitted when Gossipmonger receives deltas for an unknown peer. (It _shouldn't_ happen).

### Event `update`

  * `function (peerId, key, value) {}`
    * `id`: _String_ Id of the peer.
    * `key`: _String_ Key that was updated at the peer.
    * `value`: _Any_ The new updated value.

Emitted when Gossipmonger is aware of a key update on a remote peer.

## Gossipmonger Storage

Modules implementing the storage mechanism for Gossipmonger shall conform to the following interface. A `storage` is a JavaScript object.

Storage modules shall rely on `peer.live` property to keep track of `peer` liveness for the purposes of `deadPeers()` and `livePeers()` results.

Storage modules shall treat all `peer` properties as immutable.

### Gossipmonger Storage API

  * [storage.deadPeers()](#storagedeadpeers)
  * [storage.get(id)](#storagegetid)
  * [storage.livePeers()](#storagelivepeers)
  * [storage.put(id, peer)](#storageputid-peer)

### storage.deadPeers()

  * Return: _Array_ An array of peers that are dead (`peer.live != true`).

### storage.get(id)

  * `id`: _String_ Id of peer to get.
  * Return: _Object_ Peer with given `id` or `undefined`.

### storage.livePeers()

  * Return: _Array_ An array of peers that are live (`peer.live == true`).

### storage.put(id, peer)

  * `id`: _String_ Id of peer to put.
  * `peer`: _Object_ Peer to put into storage.

## Gossipmonger Transport

Modules implementing the transport mechanism for Gossipmonger shall conform to the following interface. A `transport` is a JavaScript object.

Transport implementations shall ensure that `deltasToSend` and `digestToSend` will be unaltered. 

Transport implementations shall ensure that `localPeer.id` and `localPeer.transport` are sent to the remote node unaltered.

Transport implementations shall allow registering and interacting with event listeners as provided by `events.EventEmitter` interface.

For reference implementation, see [gossipmonger-tcp-transport](https://github.com/tristanls/gossipmonger-tcp-transport).

### Gossipmonger Transport API

  * [transport.deltas(remotePeer, localPeer, deltasToSend)](#transportdeltasremotepeer-localpeer-deltastosend)
  * [transport.digest(remotePeer, localPeer, digestToSend)](#transportdigestremotepeer-localpeer-digesttosend)
  * [Event 'deltas'](#event-deltas)
  * [Event 'digest'](#event-digest)

### transport.deltas(remotePeer, localPeer, deltasToSend)

  * `remotePeer`: _Object_ Peer to send rpc to.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `localPeer`: _Object_ Sender peer.
    * `id`: _String_ Sender peer id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `deltasToSend`: _Any_ Deltas to send.

Sends `deltasToSend` to the `remotePeer`.

### transport.digest(remotePeer, localPeer, digestToSend)

  * `remotePeer`: _Object_ Peer to send rpc to.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `localPeer`: _Object_ Sender peer.
    * `id`: _String_ Sender peer id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `digestToSend`: _Any_ Digest to send.

Sends `digestToSend` to the `remotePeer`.

### Event `deltas`

  * `function (remotePeer, deltas) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.    
    * `deltas`: _Any_ Received deltas.

Emitted when TcpTransport receives `deltas` from a peer.

### Event `digest`

  * `function (remotePeer, digest) {}`
    * `remotePeer`: _Object_
      * `id`: _String_ Id of the peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
    * `digest`: _Any_ Received digest.

Emitted when TcpTransport receives `digest` from a peer.