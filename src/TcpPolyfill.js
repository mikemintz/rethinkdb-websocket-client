import blobToBuffer from 'blob-to-buffer';
import EventEmitter2 from 'eventemitter2';

let tcpPolyfillOptions = {
  path: '/',
  secure: false,
  wsProtocols: undefined,
  simulatedLatencyMs: undefined,
};

const notImpl = name => () => {
  throw new Error('Not implemented in TcpPolyfill: ' + name);
};

export function configureTcpPolyfill(options) {
  tcpPolyfillOptions.path = options.path;
  tcpPolyfillOptions.secure = options.secure;
  tcpPolyfillOptions.wsProtocols = options.wsProtocols;
  tcpPolyfillOptions.simulatedLatencyMs = options.simulatedLatencyMs;
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
    this._simulatedLatencyMs = tcpPolyfillOptions.simulatedLatencyMs;
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

      // Handle incoming message as base64 if ws.protocol is set to base64
      // or if it's not set at all and we are in a problematic React Native
      // environment per:
      //
      // https://tools.ietf.org/html/rfc6455#section-11.3.4
      // https://tools.ietf.org/html/rfc3864
      //
      // We check if this process is running inside React Native by using navigator.product:
      //
      // https://github.com/facebook/react-native/commit/3c65e62183ce05893be0822da217cb803b121c61

      const base64SetByWsClient = (
        typeof data === 'string' &&
        ws.protocol === 'base64'
      );

      const base64SetByUser = (
        tcpPolyfillOptions.wsProtocols &&
        tcpPolyfillOptions.wsProtocols.constructor === Array &&
        tcpPolyfillOptions.wsProtocols.indexOf('base64') >= 0
      );

      const isRN = (
        typeof navigator !== 'undefined' &&
        navigator.product === 'ReactNative'
      );

      const base64Workaround = (
        isRN &&
        base64SetByUser &&
        !ws.protocol
      );

      const handleBase64 = base64SetByWsClient || base64Workaround;

      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        blobToBuffer(data, (err, buffer) => {
          if (err) {
            throw err;
          }
          emitter.emit('data', buffer);
        });
      } else if (handleBase64) {
        emitter.emit('data', new Buffer(data, 'base64'));
      } else {
        emitter.emit('data', data);
      }
    };
  };

  this.end = data => {
    if (data !== undefined) {
      this.write(data);
    }
    ws.close();
  };

  this.destroy = () => {
    ws.close();
  };

  this.write = data => {
    // Convert data (string or node.js Buffer) to ArrayBuffer or base64 string
    // for WebSocket
    let outgoingMessage = null;
    if (ws.protocol === 'base64') {
      outgoingMessage = (new Buffer(data)).toString('base64');
    } else {
      const arrayBuffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < data.length; ++i) {
        view[i] = data[i];
      }
      outgoingMessage = arrayBuffer;
    }
    const delay = this._simulatedLatencyMs;
    if (typeof delay === 'number' && delay > 0) {
      setTimeout(() => ws.send(outgoingMessage), delay);
    } else {
      ws.send(outgoingMessage);
    }
  };

  this.setNoDelay = noDelay => {};
  this.setKeepAlive = (enable, initialDelay) => {};

  const notImplMethods = ['setEncoding', 'pause', 'resume', 'setTimeout', 'address', 'unref', 'ref'];
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
