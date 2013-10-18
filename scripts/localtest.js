// run 5 nodes in the local environment and display trance info

var Gossipmonger = require('../index.js'),
    TcpTransport = require('gossipmonger-tcp-transport'),
    util = require('util');

var t1, t2, t3, t4, t5;
var g1, g2, g3, g4, g5;
var id1 = "id1",
    id2 = "id2",
    id3 = "id3",
    id4 = "id4",
    id5 = "id5";

t1 = TcpTransport.listen({port: 9991}, function () {
    t2 = TcpTransport.listen({port: 9992}, function () {
        t3 = TcpTransport.listen({port: 9993}, function () {
            t4 = TcpTransport.listen({port: 9994}, function () {
                t5 = TcpTransport.listen({port: 9995}, function () {
                    startLocalTest();
                });
            });
        });
    });
});

function startLocalTest() {

    g1 = new Gossipmonger({id: id1, transport: {port: 9991}}, {
        seeds: [
            {id: id2, transport: {port: 9992}},
            {id: id3, transport: {port: 9993}}
        ],
        transport: t1
    });
    g2 = new Gossipmonger({id: id2, transport: {port: 9992}}, {
        seeds: [
            {id: id1, transport: {port: 9991}},
            {id: id3, transport: {port: 9993}}
        ],
        transport: t2
    });
    g3 = new Gossipmonger({id: id3, transport: {port: 9993}}, {
        seeds: [
            {id: id2, transport: {port: 9992}},
            {id: id1, transport: {port: 9991}}
        ],
        transport: t3
    });
    g4 = new Gossipmonger({id: id4, transport: {port: 9994}}, {
        seeds: [
            {id: id1, transport: {port: 9991}},
            {id: id2, transport: {port: 9992}},
            {id: id3, transport: {port: 9993}}
        ],
        transport: t4
    });
    g5 = new Gossipmonger({id: id5, transport: {port: 9995}}, {
        seeds: [
            {id: id1, transport: {port: 9991}},
            {id: id2, transport: {port: 9992}},
            {id: id3, transport: {port: 9993}}
        ],
        transport: t5
    });

    [g1, g2, g3, g4, g5].forEach(function (g) {
        g.on('deltas receive', function (remote, deltas) {
            console.log('[' + g.localPeer.id + '] deltas receive: ' + util.inspect(remote) + ' ' + util.inspect(deltas));
        });
        g.on('deltas send', function (remote, deltas) {
            console.log('[' + g.localPeer.id + '] deltas send: ' + util.inspect(remote) + ' ' + util.inspect(deltas));
        });
        g.on('digest receive', function (remote, digest) {
            console.log('[' + g.localPeer.id + '] digest receive: ' + util.inspect(remote) + ' ' + util.inspect(digest));
        });    
        g.on('digest send', function (remote, digest) {
            console.log('[' + g.localPeer.id + '] digest send: ' + util.inspect(remote) + ' ' + util.inspect(digest));
        });  
        g.on('new peer', function (peer) {
            console.log('[' + g.localPeer.id + '] new peer: ' + util.inspect(peer));
        }); 
        g.on('peer dead', function (peer) {
            console.log('[' + g.localPeer.id + '] peer dead: ' + util.inspect(peer));
        });     
        g.on('peer live', function (peer) {
            console.log('[' + g.localPeer.id + '] peer live: ' + util.inspect(peer));
        });     
        g.on('unknown peer', function (peer) {
            console.log('[' + g.localPeer.id + '] unknown peer: ' + util.inspect(peer));
        });
        g.on('update', function (peerId, key, value) {
            console.log('[' + g.localPeer.id + '] update: ' + peerId + ', ' + key + ', ' + util.inspect(value));
        });

        g.gossip();
    });

    // change some keys every second
    var endpoints = [g1, g2, g3, g4, g5]
    setInterval(function () {
        // pick random endpoint
        var g = endpoints[Math.floor(Math.random() * endpoints.length)];
        g.update("key" + Math.floor(Math.random() * 10), Math.random());
    }, 2000);
};