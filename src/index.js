'use strict';

import Promise from 'bluebird';
import rethinkdb from 'rethinkdb';
import {configureTcpPolyfill} from './TcpPolyfill';

function connect({host, port, path, secure, wsProtocols, db}) {
  configureTcpPolyfill({path, secure, wsProtocols});
  // Temporarily unset process.browser so rethinkdb uses a TcpConnection
  const oldProcessDotBrowser = process.browser;
  process.browser = false;
  const connectOptions = {host, port, db};
  const connectionPromise = Promise.promisify(rethinkdb.connect)(connectOptions);
  process.browser = oldProcessDotBrowser;
  return connectionPromise;
}

export {
  rethinkdb,
  Promise,
  connect,
};
