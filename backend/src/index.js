import 'dotenv/config';
import app from './app.js';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb.js';

const PORT = process.env.PORT || 3001;

// Initialize MongoDB connection and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      await disconnectMongoDB();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
