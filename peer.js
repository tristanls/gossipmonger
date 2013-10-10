/*

peer.js - Peer representation within Gossipmonger.

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

/*
  * `options`: _Object_
    * `data`: _Object_ _(Default: `{}`)_ Peer data.
    * `id`: _String_ Id of the peer.
    * `intervals`: _Array_ _(Default: [750])_ An array of the last 
            (up to `MAX_INTERVALS`) intervals between times when the peer has 
            been seen. 
    * `intervalsMean`: _Integer_ _(Default: undefined)_ Memoized intervals mean. 
    * `lastTime`: _Integer_ _(Default: undefined)_ The last time the peer has been seen (in milliseconds
            since midnight Jan 1, 1970).
    * `live`: _Boolean_ _(Default: true)_ Indicator whether or not the peer is
            thought to be live.
    * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating
            the last version of the peer that has been observed.
    * `MAX_INTERVALS`: _Integer_ _(Default: 100)_ The maximum number of
            intervals to keep in `intervals`.  
    * `sum`: _Integer_ _(Default: undefined)_ Memoized sum of intervals to make
            intervals mean calculation more efficient.          
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism 
            that is required for correct transport operation.
*/
var Peer = module.exports = function Peer (options) {
    var self = this;

    options = options || {};

    self.data = options.data || {};
    self.id = options.id;
    self.intervals = options.intervals || [750];
    self.intervalsMean = options.intervalsMean;
    self.lastTime = options.lastTime;
    self.live = options.live === undefined ? true : options.live;
    self.maxVersionSeen = options.maxVersionSeen || 0;
    self.MAX_INTERVALS = options.MAX_INTERVALS || 100;
    self.sum = options.sum;
    self.transport = options.transport;

    if (self.sum === undefined)
        self.sum = Peer.calculateIntervalsSum(self.intervals);

    if (self.intervalsMean === undefined) {
        var length = self.intervals.length;
        if (!length)
            length = 1;

        self.intervalsMean = self.sum / length;
    }
};

/*
  * `intervals`: _Array_ Intervals to calculate the sum of.
  Return: _Integer_ Calculated sum.
*/
Peer.calculateIntervalsSum = function calculateIntervalsSum (intervals) {
    var self = this;

    var sum = 0;
    for (var i = 0; i < intervals.length; i++) {
        sum += intervals[i];
    }
    
    return sum;
};

/*
  * `sum`: _Integer_ Current sum.
  * `newInterval`: _Integer_ New interval being added to calculate the mean.
  * `oldInterval`: _Integer_ _(Default: undefined)_ Old interval being removed 
          from being used in calculating the mean.
  Return: _Integer_ Calculated sum.
*/
Peer.calculateIntervalsSumEfficiently = function calculateIntervalsSumEfficiently (sum, newInterval, oldInterval) {
    var self = this;

    sum += newInterval;
    if (oldInterval)
        sum -= oldInterval;

    return sum;
};

/*
  * `version`: _Integer_ Vector clock version to construct deltas for.
  Return: _Array_ An array of deltas (ex delta: [key, value, version]).
*/
Peer.prototype.deltasAfterVersion = function deltasAfterVersion (version) {
    var self = this;

    var deltas = [];
    Object.keys(self.data).forEach(function (key) {
        var v = self.data[key][1]; // stored version
        if (v > version)
            deltas.push([key, self.data[key][0], v]);
    });

    return deltas;
};

/*
  * `time`: _Integer_ _(Default: `new Date().getTime()`)_ The time this peer has 
          been seen (in milliseconds since midnight Jan 1, 1970).
*/
Peer.prototype.markContact = function markContact (time) {
    var self = this;

    if (!time)
        time = new Date().getTime();

    var interval;

    if (self.lastTime) {
        interval = time - self.lastTime;
    } else {
        interval = 750; // default interval
    }

    self.lastTime = time;
    self.intervals.push(interval);

    var oldInterval;
    if (self.intervals.length > self.MAX_INTERVALS) 
        oldInterval = self.intervals.shift();

    self.sum = 
        Peer.calculateIntervalsSumEfficiently(self.sum, interval, oldInterval);

    self.intervalsMean = self.sum / self.intervals.length;
};

Peer.prototype.markDead = function markDead () {
    var self = this;

    self.live = false;
}

Peer.prototype.markLive = function markLive () {
    var self = this;

    self.live = true;
};

/*
  Return: _Number_ Calculated phi for this peer.
*/
Peer.prototype.phi = function phi () {
    var self = this;

    var now = new Date().getTime();

    if (self.lastTime === undefined)
        self.lastTime = now - 750; // default interval

    var currentInterval = now - self.lastTime;
    var exp = -1 * currentInterval / self.intervalsMean;
    var p = Math.pow(Math.E, exp);
    return -1 * (Math.log(p) / Math.log(10));
};

/*
  * `key`: _String_ Key to update.
  * `value`: _Any_ The value to update with.
  Return: _String_ If the key has been updated, the key is returned, otherwise
          a `null` is returned instead.  
*/
Peer.prototype.updateLocal = function updateLocal (key, value) {
    var self = this;

    // only update if the actual stored value is different from given value
    var stored = self.data[key];
    if (!deepEqual(stored, value)) {
        self.maxVersionSeen += 1;
        self.data[key] = [value, self.maxVersionSeen];
        return key;
    }    

    return null;
};

/*
  * `key`: _String_ The key for the value to update.
  * `value`: _Any_ The value to update with.
  * `version`: _Integer_ The vector clock version of this key value pair.
  Return: _String_ If the key has been updated, the key is returned, otherwise
          a `null` is returned instead.
*/
Peer.prototype.updateWithDelta = function updateWithDelta (key, value, version) {
    var self = this;

    if (version > self.maxVersionSeen) {
        self.maxVersionSeen = version;
        self.data[key] = [value, version];
        return key;
    }

    return null;
};