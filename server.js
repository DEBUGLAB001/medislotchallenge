const express = require('express');
const path = require('node:path');
const api = require('./src/routes/appointments');

function createApp() {
  const app = express();
  app.use(express.json());
  // Preview proxies mount the app at /runtime/:id/preview; strip that prefix
  // so ordinary relative browser requests such as "api/catalog" work.
  app.use((req, res, next) => {
    req.url = req.url.replace(/^\/runtime\/[^/]+\/preview(?=\/|$)/, '') || '/';
    next();
  });
  app.use('/api', api);
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '0.0.0.0', () => console.log(`MediSlot listening on 0.0.0.0:${port}`));
}

module.exports = { createApp };
