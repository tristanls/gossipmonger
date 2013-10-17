/*

onTransportDeltas.js - gossipmonger.transport.on('deltas', ...) test

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

test["on 'deltas' gossipmonger retrieves remote peer from storage"] = function (test) {
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
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    transport.emit('deltas', remotePeer, []);
};

test["on 'deltas' gossipmonger marks contact on previously stored peer and stores it"] = function (test) {
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
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    transport.emit('deltas', remotePeer, []);
};

test["on 'deltas' gossipmonger creates new peer if not in storage, emits 'new peer', and stores it"] = function (test) {
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
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    gossipmonger.on('new peer', function (peer) {
        test.equal(peer.id, "remote");
    });
    transport.emit('deltas', remotePeer, []);
};

test["on 'deltas' gossipmonger emits 'unknown peer' if delta for an unknown peer encountered"] = function (test) {
    test.expect(1);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var deltas = [["wat?", "foo", "bar", 173]];
    var peerMock = {
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "wat?")
                return undefined;

            return peerMock;
        },
        put: function () {}
    };
    var transport = new events.EventEmitter();
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    gossipmonger.on('unknown peer', function (id) {
        test.equal(id, "wat?");
        test.done();
    });
    transport.emit('deltas', remotePeer, deltas);
};

test["on 'deltas' gossipmonger updates peer with delta info, stores it, and emits 'update'"] = function (test) {
    test.expect(7);
    var remotePeer = {id: "remote", transport: {host: 'localhost'}};
    var deltas = [["peer1", "foo", "bar", 173]];
    var peerMock = {
        markContact: function () {}
    };
    var storage = {
        get: function (id) {
            if (id == "peer1") {
                var peer1 = {
                    id: "peer1",
                    _gotUpdated: false,
                    updateWithDelta: function (key, value, version) {
                        test.equal(key, "foo");
                        test.equal(value, "bar");
                        test.equal(version, 173);
                        peer1._gotUpdated = true;
                        return "foo";
                    }
                };
                return peer1;
            }

            return peerMock;
        },
        put: function (id, peer) {
            if (id == "peer1") {
                test.ok(peer._gotUpdated);
            }
        }
    };
    var transport = new events.EventEmitter();
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: storage,
        transport: transport
    });
    gossipmonger.on('update', function (id, key, value) {
        test.equal(id, "peer1");
        test.equal(key, "foo");
        test.equal(value, "bar");
        test.done();
    });
    transport.emit('deltas', remotePeer, deltas);
};