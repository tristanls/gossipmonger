/*

onTransportDigest.js - gossipmonger.transport.on('digest', ...) test

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

var assert = require('assert'),
    events = require('events'),
    Gossipmonger = require('../index.js');

var test = module.exports = {};

test["on 'digest' gossipmonger retrieves remote peer from storage"] = function (test) {
    test.expect(1);
    var remotePeer = {id: "remote", transport: {}};
    var peerMock = {
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            test.equal(id, remotePeer.id);
            test.done();
            return peerMock;
        },
        put: function () {}
    };
    var transport = new events.EventEmitter();
    transport.deltas = function () {};
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    transport.emit('digest', remotePeer, []);
};

test["on 'digest' gossipmonger marks contact on previously stored peer and "
    + "stores it"] = function (test) {
    test.expect(4);
    var remotePeer = {id: "remote", transport: {}};
    var peerMock = {
        id: "mock",
        markContact: function () {
            test.ok(true);
        }
    };
    var storage = {
        get: function (id) {
            test.equal(id, remotePeer.id);
            return peerMock;
        },
        put: function (id, peer) {
            test.equal(id, peerMock.id);
            test.strictEqual(peer, peerMock);
            test.done();
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function () {};
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    transport.emit('digest', remotePeer, []);
};

test["on 'digest' gossipmonger creates new peer if not in storage, emits 'new "
    + "peer', and stores it"] = function (test) {
    test.expect(5);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var peerMock = {
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            test.equal(id, remotePeer.id);
            return null;
        },
        put: function (id, peer) {
            test.equal(id, remotePeer.id);
            test.equal(peer.id, remotePeer.id);
            test.deepEqual(peer.transport, remotePeer.transport);
            test.done();
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function () {};
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    gossipmonger.on('new peer', function (peer) {
        test.equal(peer.id, "remote");
    });
    transport.emit('digest', remotePeer, []);
};

test["on 'digest' if gossipmonger finds unknown peer in digest it creates it, "
    + "emits 'new peer' and stores it"] = function (test) {
    test.expect(3);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [{id: "new1", maxVersionSeen: 3422, transport: {host: 'new1host'}}];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            return null;
        },
        put: function (id, peer) {
            if (id === "new1") {
                test.equal(peer.maxVersionSeen, 3422);
                test.deepEqual(peer.transport, {host: 'new1host'});
            }
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function () {};
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage, 
        transport: transport
    });
    gossipmonger.on('new peer', function (peer) {
        test.equal(peer.id, "new1");
        test.done();
    });
    transport.emit('digest', remotePeer, digest);
};

test["on 'digest' if gossipmonger finds unknown peer it does not create it "
    + " if it is itself"] = function (test) {
    test.expect(0);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [{id: "foo", maxVersionSeen: 3422, transport: {host: 'new1host'}}];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            return null;
        },
        put: function (id, peer) {
            if (id === "foo")
                assert.fail("treated self as remote peer");

        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function () {};
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
    test.done();
};

test["on 'digest' if gossipmonger has local peer with larger version it sends "
    + "delta to remote peer"] = function (test) {
    test.expect(5);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [{id: "new1", maxVersionSeen: 3422, transport: {host: 'new1host'}}];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            if (id == "new1") {
                return {
                    id: "new1",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [["foo", "bar", 3423]]; // deltas returned
                    },
                    maxVersionSeen: 3423
                };
            }
            return null;
        },
        put: function (id, peer) {
            if (id === "new1") {
                test.equal(peer.maxVersionSeen, 3422);
                test.deepEqual(peer.transport, {host: 'new1host'});
            }
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function (rPeer, lPeer, deltasToSend) {
        test.deepEqual(rPeer, remotePeer);
        test.equal(lPeer.id, "foo");
        test.equal(lPeer.transport, "bar");
        test.deepEqual(deltasToSend, [["new1", "foo", "bar", 3423]]);
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "foo", transport: "bar"}, {
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
};

test["on 'digest' if gossipmonger has self with larger version it sends "
    + "delta to remote peer"] = function (test) {
    test.expect(4);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [{id: "local", maxVersionSeen: 3422, transport: {host: 'new1host'}}];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            return null;
        },
        put: function (id, peer) {
            if (id === "local")
                assert.fail("treated self as remote peer");

        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function (rPeer, lPeer, deltasToSend) {
        test.deepEqual(rPeer, remotePeer);
        test.equal(lPeer.id, "local");
        test.equal(lPeer.transport, "bar");
        test.deepEqual(deltasToSend, [["local", "foo", "bar", 3423]]);
        test.done();
    };
    var gossipmonger = new Gossipmonger({
        data: {
            foo: ["bar", 3423]
        },
        id: "local", 
        maxVersionSeen: 3423,
        transport: "bar"
    }, {
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
};


test["on 'digest' if gossipmonger has deltas to send, only oldest up to "
    + "MAX_DELTAS_PER_GOSSIP will be sent"] = function (test) {
    test.expect(5);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [{id: "new1", maxVersionSeen: 3422, transport: {host: 'new1host'}}];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            if (id == "new1") {
                return {
                    id: "new1",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [
                            ["foo", "bar", 4003],
                            ["fuz", "buz", 4002],
                            ["fox", "bix", 4001],
                            ["fir", "bor", 4004]
                        ]; // deltas returned
                    },
                    maxVersionSeen: 4004
                };
            }
            return null;
        },
        put: function (id, peer) {
            if (id === "new1") {
                test.equal(peer.maxVersionSeen, 3422);
                test.deepEqual(peer.transport, {host: 'new1host'});
            }
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function (rPeer, lPeer, deltasToSend) {
        test.deepEqual(rPeer, remotePeer);
        test.equal(lPeer.id, "foo");
        test.equal(lPeer.transport, "bar");
        test.deepEqual(deltasToSend, [
                            ["new1", "fox", "bix", 4001],
                            ["new1", "fuz", "buz", 4002],
                            ["new1", "foo", "bar", 4003]
                        ]);
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "foo", transport: "bar"}, {
        MAX_DELTAS_PER_GOSSIP: 3,
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
};

test["on 'digest' if gossipmonger has deltas to send, only oldest up to "
    + "MAX_DELTAS_PER_GOSSIP will be sent from peer with most deltas to send"] = function (test) {
    test.expect(6);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [
        {id: "new1", maxVersionSeen: 3422, transport: {host: 'new1host'}},
        {id: "new2", maxVersionSeen: 3422, transport: {host: 'new2host'}}
    ];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            if (id == "new1") {
                return {
                    id: "new1",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [
                            ["foo", "bar", 4003],
                            ["fuz", "buz", 4002],
                            ["fox", "bix", 4001],
                            ["fir", "bor", 4004]
                        ]; // deltas returned
                    },
                    maxVersionSeen: 4004
                };
            }

            if (id == "new2") {
                return {
                    id: "new2",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [
                            ["foo", "bar", 5003],
                            ["fuz", "buz", 5002],
                            ["fox", "bix", 5001],
                            ["fir", "bor", 5004],
                            ["ful", "bir", 5007]
                        ]; // deltas returned
                    },
                    maxVersionSeen: 5007
                };
            }
            return null;
        },
        put: function (id, peer) {
            if (id === "new1") {
                test.equal(peer.maxVersionSeen, 3422);
                test.deepEqual(peer.transport, {host: 'new1host'});
            }
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function (rPeer, lPeer, deltasToSend) {
        test.deepEqual(rPeer, remotePeer);
        test.equal(lPeer.id, "foo");
        test.equal(lPeer.transport, "bar");
        test.deepEqual(deltasToSend, [
                            ["new2", "fox", "bix", 5001],
                            ["new2", "fuz", "buz", 5002],
                            ["new2", "foo", "bar", 5003]
                        ]);
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "foo", transport: "bar"}, {
        MAX_DELTAS_PER_GOSSIP: 3,
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
};


test["on 'digest' if gossipmonger has deltas to send, up to "
    + "MAX_DELTAS_PER_GOSSIP will be sent with first selection coming "
    + "from peer with most deltas and then others"] = function (test) {
    test.expect(6);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var digest = [
        {id: "new1", maxVersionSeen: 3422, transport: {host: 'new1host'}},
        {id: "new2", maxVersionSeen: 3422, transport: {host: 'new2host'}}
    ];
    var peerMock = {
        id: "mock",
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "remote")
                return peerMock;
            
            if (id == "new1") {
                return {
                    id: "new1",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [
                            ["foo", "bar", 4003],
                            ["fuz", "buz", 4002],
                            ["fox", "bix", 4001],
                            ["fir", "bor", 4004]
                        ]; // deltas returned
                    },
                    maxVersionSeen: 4004
                };
            }

            if (id == "new2") {
                return {
                    id: "new2",
                    deltasAfterVersion: function (version) {
                        test.equal(version, 3422);
                        return [
                            ["foo", "bar", 5003],
                            ["fuz", "buz", 5002],
                            ["fox", "bix", 5001],
                            ["fir", "bor", 5004],
                            ["oxd", "fsj", 5005]
                        ]; // deltas returned
                    },
                    maxVersionSeen: 5005
                };
            }
            return null;
        },
        put: function (id, peer) {
            if (id === "new1") {
                test.equal(peer.maxVersionSeen, 3422);
                test.deepEqual(peer.transport, {host: 'new1host'});
            }
        }
    };
    var transport = new events.EventEmitter();
    transport.deltas = function (rPeer, lPeer, deltasToSend) {
        test.deepEqual(rPeer, remotePeer);
        test.equal(lPeer.id, "foo");
        test.equal(lPeer.transport, "bar");
        test.deepEqual(deltasToSend, [
                            ["new2", "fox", "bix", 5001],
                            ["new2", "fuz", "buz", 5002],
                            ["new2", "foo", "bar", 5003],
                            ["new2", "fir", "bor", 5004],
                            ["new2", "oxd", "fsj", 5005],
                            ["new1", "fox", "bix", 4001]
                        ]);
        test.done();
    };
    var gossipmonger = new Gossipmonger({id: "foo", transport: "bar"}, {
        MAX_DELTAS_PER_GOSSIP: 6,
        storage: storage, 
        transport: transport
    });
    transport.emit('digest', remotePeer, digest);
};