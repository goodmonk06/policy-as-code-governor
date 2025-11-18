import Fastify from 'fastify';
import cors from '@fastify/cors';
import { policySetRoutes } from './routes/policy-sets';

const PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true, // Allow all origins in development
      credentials: true
    });

    // Health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(policySetRoutes);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });

    console.log(`🚀 Policy-as-Code API is running on http://${HOST}:${PORT}`);
    console.log(`📚 Health check: http://${HOST}:${PORT}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
