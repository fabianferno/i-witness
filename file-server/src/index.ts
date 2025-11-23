import dotenv from 'dotenv';
import createApp from './app.js';
import { connectToMongoDB, closeMongoDB } from './services/mongodb.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = createApp();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize MongoDB connection
connectToMongoDB().catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  // Continue running even if MongoDB connection fails
  // The upload will still work, but hash won't be saved
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutdown signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closeMongoDB();
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

