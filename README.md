# gossipmonger

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/gossipmonger.png)](http://npmjs.org/package/gossipmonger)

Gossipmonger is an implementation of the Scuttlebutt gossip protocol endpoint for real-time peer-to-peer peer-state distribution.

## Installation

    npm install gossipmonger

## Tests

    npm test

_NOTE: There are no tests right now._

## Overview

Gossipmonger is an implementation of the Scuttlebutt gossip protocol endpoint for real-time peer-to-peer peer-state distribution. Gossip protocols are used in a decentralized peer-to-peer manner in order to make every peer that is connected aware of the state of every other peer. The objective is to give every peer global awareness without a centralized server. This is accomplished by heuristically guided message passing between peers. 

### Peers

Gossipmonger manages information about _peers_ via maintaining peer information in a structure called a _peer_. A peer stores the details of a particular peer on the network, including the data necessary to estimate whether the peer is "alive" or "dead".

Peers are implemented internally as JavaScript objects, and most details are not necessary to be exposed, however when creating a new Gossipmonger, the following are required to be provided in `options.peerInfo`:

  * `data`: _Object_ _(Default: {})_ A map of key, [value, version] pairs to store for this peer. 
  * `id`: _String_ Id of this peer.      
  * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating the last version of the version of the last change of this peer.
  * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.

All peer attributes are as follows:

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

### Deltas

Deltas are passed around between peers in response to receiving a digest to update any information that (from the senders perspective) is out of date.

## Documentation

### Gossipmonger

**Public API**

  * [new Gossipmonger(options)](#new-gossipmongeroptions)
  * [gossipmonger.gossip()](#gossipmongergossip)
  * [gossipmonger.update(key, value)](#gossipmongerupdatekey-value)
  * [Event 'new peer'](#event-new-peer)
  * [Event 'peer dead'](#event-peer-dead)
  * [Event 'peer live'](#event-peer-live)
  * [Event 'update'](#event-update)

#### new Gossipmonger(options)

  * `options`: _Object_
    * `DEAD_PEER_PHI`: _Integer_ _(Default: 8)_ Phi accrual failure detector value that when exceeded assumes the corresponding peer is dead.
    * `GOSSIP_INTERVAL`: _Integer_ _(Default: 1000)_ Number of milliseconds between gossip attempts.
    * `MAX_DELTAS_PER_GOSSIP`: _Integer_ _(Default: 5)_ The maximum number of deltas to include in a gossip.
    * `MINIMUM_LIVE_PEERS`: _Integer_ _(Default: 1)_ If the number of live peers visible to this peer drops below `MINIMUM_LIVE_PEERS`, this peer will make sure to gossip with one of the seeds even if it thinks it's dead.
    * `peerInfo`: _Object_
      * `data`: _Object_ _(Default: {})_ A map of key, [value, version] pairs to store for this peer. 
      * `id`: _String_ Id of this peer.      
      * `maxVersionSeen`: _Integer_ _(Default: 0)_ Vector clock value indicating the last version of the version of the last change of this peer.
      * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
    * `seeds`: _Array_ _(Default: [])_ An array of seed peers that the `transport` understands.
    * `storage`: _Object_ _(Default: `gossipmonger-memory-storage`)_ An initialized and ready to use storage module for storing local and peer data that conforms to the Gossipmonger Storage Protocol. If `storage` is not provided, a new instance of `gossipmonger-memory-storage` will be created and used with default settings.
    * `transport`: _Object_ _(Default: `gossipmonger-tcp-transport`)_ An initialized and ready to use transport module for sending communications that conforms to the Gossipmonger Transport Protocol. If `transport` is not provided, a new instance of `gossipmonger-tcp-transport` will be created and used with default settings.

Creates a new Gossipmonger instance.

The `seeds` are necessary in order to bootstrap the gossip cluster. Gossipmonger will use these `seeds` to find out about other nodes and also as peers of last resort if all the peers appear to be dead.

#### gossipmonger.digest(livePeers)

_**CAUTION: reserved for internal use**_

  * `livePeers`: _Array_ _(Default: [])_ An array of live peers.
  * Return: _Array_ An array of peers with `maxVersionSeen` fields included.

Creates a digest of peers that are thought to be "live" to send to another peer.

#### gossipmonger.gossip()

Initiates gossip and will continue to gossip according to `GOSSIP_INTERVAL`.

Each gossip goes through the following stages:

1. Select a random live peer (if any) and send my digest to the peer.
2. Maybe send my digest to a random dead peer (or do so for sure if all peers appear to be dead).
3. If number of live peers is below `MINIMUM_LIVE_PEERS` send my digest to a random seed.
4. Update my estimate of the liveness of all live peers.
5. Update my estimate of the deadness of all dead peers.
6. Set timeout to gossip again `GOSSIP_INTERVAL` from now.

#### gossipmonger.update(key, value)

  * `key`: _String_ Key to update.
  * `value`: _Any_ The value to update with.

Updates the local peer's `key` with specified `value`.

#### Event `deltas receive`

_**CAUTION: reserved for internal use**_

  * `remotePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.    
  * `deltas`: _Array_ An array of deltas to update local knowledge with. Each delta is of the form: [peerId, key, value, version].

Emitted when Gossipmonger receives deltas from a remote peer.

#### Event `deltas send`

_**CAUTION: reserved for internal use**_

  * `remotePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.    
  * `deltas`: _Array_ An array of deltas to update local knowledge with. Each delta is of the form: [peerId, key, value, version].

Emitted when Gossipmonger sends deltas to a remote peer.

#### Event `digest receive`

_**CAUTION: reserved for internal use**_

  * `remotePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
  * `digest`: _Array_ An array of peer objects with `id`, `maxVersionSeen`, and `transport` fields.

Emitted when Gossipmonger receives a digest from a remote peer.

#### Event `digest send`

_**CAUTION: reserved for internal use**_

  * `remotePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.
  * `digest`: _Array_ An array of peer objects with `id`, `maxVersionSeen`, and `transport` fields.

Emitted when Gossipmonger sends a digest to a remote peer.

#### Event `new peer`

  * `remotePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.   

Emitted when Gosspimonger becomes aware of a new peer.

#### Event `peer dead`

  * `deadPeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation.     

Emitted when Gossipmonger assumes that a live peer is now dead.

#### Event `peer live`

  * `livePeer`: _Object_
    * `id`: _String_ Id of the peer.
    * `transport`: _Any_ Any data identifying this peer to the transport mechanism that is required for correct transport operation. 

Emitted when Gossipmonger assumes that a dead peer is now live.

#### Event `unknown peer`

_**CAUTION: reserved for internal use**_

  * `id`: _String_ Id of the unknown peer.    

Emitted when Gossipmonger receives deltas for an unknown peer. (It _shouldn't_ happen).

#### Event `update`

  * `id`: _String_ Id of the peer.
  * `key`: _String_ Key that was updated at the peer.
  * `value`: _Any_ The new updated value.

Emitted when Gossipmonger is aware of a key update on a remote peer.