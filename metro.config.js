// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1) Allow Metro to resolve .cjs files (Firebase ships some .cjs modules)
config.resolver.sourceExts.push('cjs');
// 2) Work around Firebase’s newer package‑exports field
config.resolver.unstable_enablePackageExports = false;

module.exports = config;