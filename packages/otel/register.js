// Stub for node10-style module resolution (which ignores package.json
// "exports"): `@smallmodelstudio/otel/register` resolves straight to this
// file by path. Modern resolvers use the "exports" map in package.json
// instead and never load this.
module.exports = require('./dist/register.js');
