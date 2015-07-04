'use strict';

import blobToBuffer from 'blob-to-buffer';
import EventEmitter2 from 'eventemitter2';

let tcpPolyfillOptions = {
  path: '/',
  secure: false,
  wsProtocols: undefined,
};

const notImpl = name => () => {
  throw new Error('Not implemented in TcpPolyfill: ' + name);
};

export function configureTcpPolyfill(options) {
  tcpPolyfillOptions.path = options.path;
  tcpPolyfillOptions.secure = options.secure;
  tcpPolyfillOptions.wsProtocols = options.wsProtocols;
}

export function Socket(options) {
  if (!(this instanceof Socket)) {
    return new Socket(options);
  }

  const emitter = new EventEmitter2({});
  ['on', 'once', 'removeListener', 'emit', 'addListener', 'removeAllListeners', 'setMaxListeners', 'listeners'].forEach(method => {
    this[method] = emitter[method].bind(emitter);
  });

  let ws = null;

  this.connect = (port, host, connectListener) => {
    const protocol = tcpPolyfillOptions.secure ? 'wss' : 'ws';
    const path = tcpPolyfillOptions.path;
    const url = `${protocol}://${host}:${port}${path}`;
    ws = new WebSocket(url, tcpPolyfillOptions.wsProtocols);
    if (connectListener) {
      emitter.on('connect', connectListener);
    }

    ws.onopen = event => {
      emitter.emit('connect');
    };

    ws.onclose = event => {
      emitter.emit('end');
      emitter.emit('close');
    };

    ws.onerror = event => {
      emitter.emit('error', event);
    };

    ws.onmessage = event => {
      const data = event.data;
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        blobToBuffer(data, (err, buffer) => {
          if (err) {
            throw err;
          }
          emitter.emit('data', buffer);
        });
      } else {
        emitter.emit('data', data);
      }
    };
  };

  this.end = data => {
    if (data !== undefined) {
      ws.send(data);
    }
    ws.close();
  };

  this.destroy = () => {
    ws.close();
  };

  this.write = data => {
    ws.send(data);
  };

  this.setNoDelay = noDelay => {};

  const notImplMethods = ['setEncoding', 'pause', 'resume', 'setTimeout', 'setKeepAlive', 'address', 'unref', 'ref'];
  notImplMethods.forEach(name => {
    this[name] = notImpl(name);
  });
}

export function connect(...args) {
  const opts = {};
  if (args[0] && typeof args[0] === 'object') {
    opts.port = args[0].port;
    opts.host = args[0].host;
    opts.connectListener = args[1];
  } else if (Number(args[0]) > 0) {
    opts.port = args[0];
    opts.host = args[1];
    opts.connectListener = args[2];
  } else {
    throw new Error('Unsupported arguments for net.connect');
  }
  const socket = new Socket();
  socket.connect(opts.port, opts.host, opts.connectListener);
  return socket;
}

export const createConnection = connect;

export const createServer = notImpl('createServer');

// This is wrong, but irrelevant for connecting via websocket
export const isIPv4 = input => true;
export const isIPv6 = input => false;
export const isIP = input => isIPv4(input) ? 4 : isIPv6(input) ? 6 : 0;
