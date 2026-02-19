const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude backend (Node.js) from Metro bundling
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /backend\/.*/,
];

module.exports = config;
