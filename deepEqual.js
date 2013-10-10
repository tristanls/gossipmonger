/*

deepEqual.js - deepEqual implementation for gossipmonger.

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

var pSlice = Array.prototype.slice;

var deepEqual = module.exports = function deepEqual (actual, expected) {
    if (actual === expected)
        return true;

    if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
        if (actual.length != expected.length)
            return false;

        for (var i = 0; i < actual.length; i++) {
            if (actual[i] !== expected[i])
                return false;
        }

        return true;
    }

    if (actual instanceof Date && expected instanceof Date)
        return actual.getTime() === expected.getTime();

    if (typeof actual != 'object' && typeof expected != 'object')
        return actual == expected;

    return objEquiv(actual, expected);
};

function isArguments (object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
}

function isUndefinedOrNull (value) {
    return value === null || value === undefined;
}

function objEquiv (a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
        return false;

    if (a.prototype !== b.prototype)
        return false;

    if (isArguments(a)) {
        if (!isArguments(b))
            return false;

        a = pSlice.call(a);
        b = pSlice.call(b);
        return deepEqual(a, b);
    }

    try {
        var ka = Object.keys(a),
            kb = Object.keys(b),
            key, i;
    } catch (e) {
        return false;
    }

    ka.sort();
    kb.sort();

    for (var i = ka.length - 1; i >= 0; i--) {
        if (ka[i] != kb[i])
            return false;
    }

    for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        if (!deepEqual(a[key], b[key]))
            return false;
    }

    return true;
}