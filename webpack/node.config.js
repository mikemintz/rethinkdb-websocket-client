var webpack = require('webpack');
var config = require('./base.config.js');

config.output.filename = 'node.js';

config.plugins.push(new webpack.ProvidePlugin({WebSocket: 'ws'}));

module.exports = config;
