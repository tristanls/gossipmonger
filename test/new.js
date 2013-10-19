/*

new.js - new Gossipmonger(peerInfo, options) test

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

var Gossipmonger = require('../index.js'),
    GossipmongerPeer = require('gossipmonger-peer');

var test = module.exports = {};

test['new Gossipmonger() creates a peer from peerInfo'] = function (test) {
    test.expect(4);
    var gossipmonger = new Gossipmonger({
        id: "foo", 
        maxVersionSeen: 324134,
        transport: {
            host: 'localhost',
            port: 1337
        }
    });
    test.ok(gossipmonger.localPeer instanceof GossipmongerPeer);
    test.equal(gossipmonger.localPeer.id, "foo");
    test.equal(gossipmonger.localPeer.maxVersionSeen, 324134);
    test.deepEqual(gossipmonger.localPeer.transport, {host: 'localhost', port: 1337});
    test.done();
};

test['new Gossipmonger() initializes default transport with self.localPeer.transport'] = function (test) {
    test.expect(2);
    var gossipmonger = new Gossipmonger({
        id: "foo", 
        maxVersionSeen: 324134,
        transport: {
            host: 'localhost',
            port: 1337
        }
    });
    test.equal(gossipmonger.transport.host, 'localhost');
    test.equal(gossipmonger.transport.port, 1337);
    test.done();
};

test["new Gossipmonger() registers a listener for 'deltas' event on transport"] = function (test) {
    test.expect(1);
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        transport: {
            on: function (event, callback) {
                if (event == 'deltas') {
                    test.ok(true);
                    test.done();
                }
            }
        }
    });
};


test["new Gossipmonger() registers a listener for 'digest' event on transport"] = function (test) {
    test.expect(1);
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        transport: {
            on: function (event, callback) {
                if (event == 'digest') {
                    test.ok(true);
                    test.done();
                }
            }
        }
    });
};

test["new Gossipmonger() registers a listener for 'error' event on transport"] = function (test) {
    test.expect(1);
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        transport: {
            on: function (event, callback) {
                if (event == 'error') {
                    test.ok(true);
                    test.done();
                }
            }
        }
    });
};

test["new Gossipmonger() registers a listener for 'error' event on storage"] = function (test) {
    test.expect(1);
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        storage: {
            on: function (event, callback) {
                if (event == 'error') {
                    test.ok(true);
                    test.done();
                }
            }
        }
    });
};

test["new Gossipmonger() does not automatically set timeout for gossip"] = function (test) {
    test.expect(1);
    var gossipmonger = new Gossipmonger({id: "foo"});
    test.ok(!gossipmonger.timeout);
    test.done();
};