var webpack = require('webpack');
var FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var TcpPolyfillPlugin = require('./TcpPolyfillPlugin');
var TlsStubPlugin = require('./TlsStubPlugin');

module.exports = function(isBrowser) {
  var config = {
    entry: ['./src/index'],
    output: {
      library: 'RethinkdbWebsocketClient',
      libraryTarget: 'umd',
      path: __dirname + '/../dist',
      filename: isBrowser ? 'index.js' : 'node.js'
    },
    plugins: [],
    module: {
      loaders: [
        { test: /\.js$/, loaders: ['babel', 'eslint'], exclude: /node_modules/ }
      ]
    }
  };

  if (!isBrowser) {
    config.plugins.push(new webpack.ProvidePlugin({WebSocket: 'ws'}));
  }

  // Very similar behavior to setting config.target to 'node', except it doesn't
  // set the 'net' or 'tls' modules as external. That way, we can use
  // TcpPolyfillPlugin and TlsStubPlugin to override those modules.
  //
  // For node.js target, we leave tls in externals because it's needed for ws.
  config.target = function(compiler) {
    var nodeNatives = Object.keys(process.binding('natives'));
    var mocks = ['net'];
    if (isBrowser) {
      mocks.push('tls');
    }
    var externals = nodeNatives.filter(function(x) {
      return mocks.indexOf(x) < 0;
    });
    compiler.apply(
      new NodeTemplatePlugin(config.output, false),
      new FunctionModulePlugin(config.output),
      new webpack.ExternalsPlugin('commonjs', externals),
      new webpack.LoaderTargetPlugin('node'),
      new TcpPolyfillPlugin(/node_modules\/rethinkdb/),
      new TlsStubPlugin(/node_modules\/rethinkdb/)
    );
  };

  return config;
};
