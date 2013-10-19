/*

onTransportError.js - gossipmonger.transport.on('error', ...) test

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

test["on 'error' gossipmonger promotes the error to gossipmonger error event"] = function (test) {
    test.expect(1);
    var transport = new events.EventEmitter();
    var gossipmonger = new Gossipmonger({id: "foo"}, {
        transport: transport
    });
    var err = new Error("oh no!");
    gossipmonger.on('error', function (error) {
        test.strictEqual(error, err);
        test.done();
    });
    transport.emit('error', err);
};