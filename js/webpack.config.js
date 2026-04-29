const config = require('flarum-webpack-config')();

// Ensure forum entry exists
if (!config.entry || !config.entry.forum) {
  config.entry = config.entry || {};
  config.entry.forum = './src/forum/index.js';
}

// Use named module IDs to avoid numeric ID collisions
config.optimization = config.optimization || {};
config.optimization.moduleIds = 'named';
config.optimization.chunkIds = 'named';
config.optimization.usedExports = false;
config.optimization.sideEffects = true;

module.exports = config;
