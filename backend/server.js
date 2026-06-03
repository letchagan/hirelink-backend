const app = require('./app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to database, initialize schemas, seed initial data, then launch the server
db.connectAndBootstrap()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Hirescheduler API server is successfully active!`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`⚡ Mode: ${process.env.USE_SQLITE === 'true' ? 'SQLite Offline' : 'MySQL Production'}`);
      console.log(`====================================================`);
    });
  })
  .catch((err) => {
    console.error('CRITICAL: Database bootstrap failed. Server starting aborted.');
    console.error(err);
    process.exit(1);
  });
