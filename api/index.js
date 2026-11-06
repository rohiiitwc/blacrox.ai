const app = require('../server');

if (require.main === module) {
  const { startServer } = require('../server');
  startServer();
}

module.exports = app;
