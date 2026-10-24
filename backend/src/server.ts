import { createApp } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`🛡️  PRoof Backend API running at http://${displayHost}:${PORT}`);
  console.log(`👉 Health check: http://${displayHost}:${PORT}/api/health`);
  console.log(`👉 Samples list: http://${displayHost}:${PORT}/api/samples`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

