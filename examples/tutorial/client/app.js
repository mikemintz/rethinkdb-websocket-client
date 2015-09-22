// Import third-party libraries (managed by npm and webpack)
var RethinkdbWebsocketClient = require('rethinkdb-websocket-client');
var r = RethinkdbWebsocketClient.rethinkdb;

// Open a WebSocket connection to the server to send RethinkDB queries over
var options = {
  host: 'localhost', // hostname of the websocket server
  port: 8015,        // port number of the websocket server
  path: '/db',       // HTTP path to websocket route
  secure: false,     // set true to use secure TLS websockets
  db: 'test',        // default database, passed to rethinkdb.connect
};
var connPromise = RethinkdbWebsocketClient.connect(options);

// Obtain reference to our <div id="app"> element
var appDiv = document.getElementById('app');
appDiv.innerHTML = 'Loading...';

// Construct a RethinkDB query to list all rows in the 'turtles' table
var query = r.table('turtles');

connPromise.then(function(conn) {
  // Run the query once the WebSocket is connected
  return query.run(conn).then(function(cursor) {
    return cursor.toArray().then(function(results) {
      // Render query results into the <div id="app"> element on index.html
      appDiv.innerHTML = JSON.stringify(results, null, 2);
    });
  });
}).catch(function(error) {
  appDiv.innerHTML = JSON.stringify(error, null, 2);
});
