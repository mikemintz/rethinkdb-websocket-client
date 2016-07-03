[![npm version](https://img.shields.io/npm/v/rethinkdb-websocket-client.svg)](https://www.npmjs.com/package/rethinkdb-websocket-client)
[![Travis](https://img.shields.io/travis/mikemintz/rethinkdb-websocket-client.svg)](https://travis-ci.org/mikemintz/rethinkdb-websocket-client)

# rethinkdb-websocket-client

RethinkDB JavaScript driver monkey-patched to connect via WebSocket. Works in
browser, Electron and Node.JS environments.

## What is this?

This library wraps the [official JavaScript RethinkDB
driver](http://rethinkdb.com/docs/install-drivers/javascript/), monkey-patching
the node.js net module so that it connects over WebSocket. Other than calling
`RethinkdbWebsocketClient.connect` instead of `rethinkdb.connect`, the API is
identical. And other than the HTTP upgrade request at the start, the protocol
over the wire is unchanged.

Since RethinkDB does not accept WebSocket connections, you will have to use a
proxy on the server that accepts WebSocket connects and proxies them to the
RethinkDB TCP port:
* [websockify](https://github.com/kanaka/websockify) is a server that listens
  for incoming WebSocket connections, and blindly forwards traffic in both
  directions to a specified TCP address. To set up a websockify server at that
  forwards WebSocket port 8015 to RethinkDB running locally on port 28015, run
  `./run localhost:8015 localhost:28015`
* [rethinkdb-websocket-server](https://github.com/mikemintz/rethinkdb-websocket-server)
  is a node.js server library that functions similarly to websockify. However,
  it parses incoming RethinkDB queries from browser clients and runs them
  through custom validation before forwarding the query to the RethinkDB
  server.

## How do I use this?

This package should be installed with [npm](https://www.npmjs.com/). You
probably want to use something like [webpack](http://webpack.github.io/) or
[browserify](http://browserify.org/) to include it in your web application. In
theory it will also run on node.js, but I have not yet tested that.

Here is a simple example of how to use it:

```js
var RethinkdbWebsocketClient = require('rethinkdb-websocket-client');
var r = RethinkdbWebsocketClient.rethinkdb;

// In case you want bluebird, which is bundled with the rethinkdb driver
var Promise = RethinkdbWebsocketClient.Promise;

var options = {
  host: 'localhost',       // hostname of the websocket server
  port: 8015,              // port number of the websocket server
  path: '/',               // HTTP path to websocket route
  wsProtocols: ['binary'], // sub-protocols for websocket, required for websockify
  secure: false,           // set true to use secure TLS websockets
  db: 'test',              // default database, passed to rethinkdb.connect
  simulatedLatencyMs: 100, // wait 100ms before sending each message (optional)
};

RethinkdbWebsocketClient.connect(options).then(function(conn) {
  var query = r.table('turtles');
  query.run(conn, function(err, cursor) {
    cursor.toArray(function(err, results) {
      console.log(results);
    });
  });
});
```

## Other environments

### React

For [React](http://facebook.github.io/react/) integration, see the
[react-rethinkdb](https://github.com/mikemintz/react-rethinkdb) library.

### Node.JS and Electron

To use inside Electron or on the server in Node.JS (as opposed to the browser), use the following
path when importing the module:
```js
var RethinkdbWebsocketClient = require('rethinkdb-websocket-client/dist/node');
```

If you need to route the WebSocket through a proxy server you can provide your own `agent` via the `wsProtocols` configuration parameter, e.g.:

```js
var Socks = require('socks');
var options = {
  host: 'localhost',       // hostname of the websocket server
  port: 8015,              // port number of the websocket server
  path: '/',               // HTTP path to websocket route
  wsProtocols: {
    agent: new Socks.Agent({
      proxy: { ipaddress: '127.0.0.1', port: 8080, type: 5 }
    })
  },
  secure: false,           // set true to use secure TLS websockets
  db: 'test',              // default database, passed to rethinkdb.connect
  simulatedLatencyMs: 100, // wait 100ms before sending each message (optional)
};
```
