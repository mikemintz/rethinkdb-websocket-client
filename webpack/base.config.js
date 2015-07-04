var webpack = require('webpack');
var FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');
var NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
var TcpPolyfillPlugin = require('./TcpPolyfillPlugin');

var config = {
  entry: ['./src/index'],
  output: {
    library: 'RethinkdbWebsocketClient',
    libraryTarget: 'umd',
    path:  __dirname + '/../dist',
    filename: 'index.js'
  },
  plugins: [],
  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel', 'eslint'], exclude: /node_modules/ }
    ]
  }
};

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

module.exports = config;
