var webpack = require('webpack');
var FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var TcpPolyfillPlugin = require('./TcpPolyfillPlugin');

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
  // set the 'net' module as external. That way, we can use TcpPolyfillPlugin to
  // override the 'net' module.
  config.target = function(compiler) {
    var nodeNatives = Object.keys(process.binding('natives'));
    var externals = nodeNatives.filter(function(x) {
      return x !== 'net';
    });
    compiler.apply(
      new NodeTemplatePlugin(config.output, false),
      new FunctionModulePlugin(config.output),
      new webpack.ExternalsPlugin('commonjs', externals),
      new webpack.LoaderTargetPlugin('node'),
      new TcpPolyfillPlugin(/node_modules\/rethinkdb/)
    );
  };

  return config;
};
