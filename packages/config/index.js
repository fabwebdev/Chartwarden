/**
 * @chartwarden/config
 * Shared configurations for the Chartwarden monorepo
 */

module.exports = {
  eslint: require('./eslint'),
  typescript: {
    base: './typescript/tsconfig.base.json',
    node: './typescript/tsconfig.node.json',
    next: './typescript/tsconfig.next.json'
  }
};
