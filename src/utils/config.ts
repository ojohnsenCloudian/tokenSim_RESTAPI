// Configuration management utilities

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  port: parseInt(process.env.PORT || '3443', 10),
  tokensimContainerName: process.env.TOKENSIM_CONTAINER_NAME || 'ats-runtime',
  volumePath: process.env.VOLUME_PATH || '/home/ats/files',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.jwtSecret || config.jwtSecret === 'your-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Change this in production!');
}

