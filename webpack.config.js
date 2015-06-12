module.exports = {
  entry: ['./src/index'],
  output: {
    library: 'RethinkdbWebsocketClient',
    libraryTarget: 'umd',
    path:  __dirname + '/dist',
    filename: 'index.js'
  },
  resolve: {
    alias: {
      net: __dirname + '/src/TcpPolyfill.js'
    }
  },
  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel', 'eslint'], exclude: /node_modules/ }
    ]
  }
};
