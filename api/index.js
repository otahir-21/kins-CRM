// Vercel serverless entry: all /api, /auth, /health requests are sent here
const app = require('../server.js');
module.exports = app;
