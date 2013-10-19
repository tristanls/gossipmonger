/*

gossip.js - gossipmonger.gossip() test

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
    Gossipmonger = require('../index.js');

var test = module.exports = {};

test['gossip() selects random live peer to send digest to'] = function (test) {
    test.expect(4);
    var lPeers = [
                {id: "live1", phi: function () { return 1; }},
                {id: "live2", phi: function () { return 1; }},
                {id: "live3", phi: function () { return 1; }},
                {id: "live4", phi: function () { return 1; }}
            ];
    var storage = {
        deadPeers: function () {
            return [];
        },
        livePeers: function () {
            return lPeers;
        },
        on: function () {}
    };
    var transport = new events.EventEmitter();
    transport.digest = function (livePeer, localPeer, digest) {
        test.ok(["live1", "live2", "live3", "live4"].indexOf(livePeer.id) > -1);
        test.equal(localPeer.id, "local");
        test.equal(digest, "digestMock");
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "local"}, {
        MINIMUM_LIVE_PEERS: 3,
        storage: storage,
        transport: transport
    });
    gossipmonger.digest = function (livePeers) {
        test.deepEqual(livePeers, lPeers);
        return "digestMock";
    };
    gossipmonger.gossip();
    clearTimeout(gossipmonger.timeout);
};

test['gossip() selects random dead peer to send digest to (if no live peers)'] = function (test) {
    test.expect(4);
    var dPeers = [
                {id: "dead1", phi: function () { return 9999999; }},
                {id: "dead2", phi: function () { return 9999999; }},
                {id: "dead3", phi: function () { return 9999999; }},
                {id: "dead4", phi: function () { return 9999999; }}
            ];
    var storage = {
        deadPeers: function () {
            return dPeers;
        },
        livePeers: function () {
            return [];
        },
        on: function () {}
    };
    var transport = new events.EventEmitter();
    transport.digest = function (deadPeer, localPeer, digest) {
        test.ok(["dead1", "dead2", "dead3", "dead4"].indexOf(deadPeer.id) > -1);
        test.equal(localPeer.id, "local");
        test.equal(digest, "digestMock");
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "local"}, {
        MINIMUM_LIVE_PEERS: 3,
        storage: storage,
        transport: transport
    });
    gossipmonger.digest = function (livePeers) {
        test.deepEqual(livePeers, []);
        return "digestMock";
    };
    gossipmonger.gossip();
    clearTimeout(gossipmonger.timeout);
};

test['gossip() selects random seed to send digest to if live peers less'
    + ' than MINIMUM_LIVE_PEERS'] = function (test) {
    test.expect(4);
    var lPeers = [
                {id: "live1", phi: function () { return 1; }},
                {id: "live2", phi: function () { return 1; }},
                {id: "live3", phi: function () { return 1; }},
                {id: "live4", phi: function () { return 1; }}
            ];
    var storage = {
        deadPeers: function () {
            return [];
        },
        livePeers: function () {
            return lPeers;
        },
        on: function () {}
    };
    var transport = new events.EventEmitter();
    transport.digest = function (seed, localPeer, digest) {
        if (seed.id.match("live")) 
            return;

        test.ok(["seed1", "seed2", "seed3"].indexOf(seed.id) > -1);
        test.equal(localPeer.id, "local");
        test.equal(digest, "digestMock");
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "local"}, {
        MINIMUM_LIVE_PEERS: 6,
        seeds: [
            {id: "seed1", transport: "1trans"},
            {id: "seed2", transport: "2trans"},
            {id: "seed3", transport: "3trans"}          
        ],
        storage: storage,
        transport: transport
    });
    gossipmonger.digest = function (livePeers) {
        test.deepEqual(livePeers, lPeers);
        return "digestMock";
    };
    gossipmonger.gossip();
    clearTimeout(gossipmonger.timeout);
};


test['gossip() updates liveness of live and dead peers'] = function (test) {
    test.expect(13);
    var lPeers = [
                {id: "live1", phi: function () { test.ok(true); return 1; }},
                {id: "live2", phi: function () { test.ok(true); return 1; }},
                {
                    id: "live3", 
                    phi: function () { test.ok(true); return 9999; },
                    markDead: function () { test.ok(true); }
                },
                {id: "live4", phi: function () { test.ok(true); return 1; }}
            ];
    var dPeers = [
                {id: "dead1", phi: function () { test.ok(true); return 9999; }},
                {
                    id: "dead2", 
                    phi: function () { test.ok(true); return 1; },
                    markLive: function () { test.ok(true); }
                },
                {id: "dead3", phi: function () { test.ok(true); return 9999; }},
                {id: "dead4", phi: function () { test.ok(true); return 9999; }}
            ];
    var storage = {
        deadPeers: function () {
            return dPeers;
        },
        livePeers: function () {
            return lPeers;
        },
        on: function () {},
        put: function (id, peer) {
            // called twice (once for live3 and once for dead2)
            test.ok(["live3", "dead2"].indexOf(id) > -1);
        }
    };
    var transport = new events.EventEmitter();
    transport.digest = function () {};
    var gossipmonger = new Gossipmonger({id: "local"}, {
        MINIMUM_LIVE_PEERS: 6,
        seeds: [
            {id: "seed1", transport: "1trans"},
            {id: "seed2", transport: "2trans"},
            {id: "seed3", transport: "3trans"}          
        ],
        storage: storage,
        transport: transport
    });
    gossipmonger.digest = function (livePeers) {
        test.deepEqual(livePeers, lPeers);
        return "digestMock";
    };
    gossipmonger.gossip();
    clearTimeout(gossipmonger.timeout);
    test.done();
};

test['gossip() sets timeout to go another round'] = function (test) {
    test.expect(1);
    var lPeers = [
                {id: "live1", phi: function () { return 1; }},
                {id: "live2", phi: function () { return 1; }},
                {id: "live3", phi: function () { return 1; }},
                {id: "live4", phi: function () { return 1; }}
            ];
    var storage = {
        deadPeers: function () {
            return [];
        },
        livePeers: function () {
            return lPeers;
        },
        on: function () {}
    };
    var transport = new events.EventEmitter();
    transport.digest = function () {};
    var gossipmonger = new Gossipmonger({id: "local"}, {
        storage: storage,
        transport: transport
    });
    gossipmonger.digest = function () {};
    gossipmonger.gossip();
    test.ok(gossipmonger.timeout);
    clearTimeout(gossipmonger.timeout);
    test.done();
};