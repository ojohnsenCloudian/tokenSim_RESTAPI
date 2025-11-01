// Configuration management utilities

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  apiToken: process.env.API_TOKEN || 'your-api-token-change-in-production',
  port: parseInt(process.env.PORT || '3443', 10),
  tokensimContainerName: process.env.TOKENSIM_CONTAINER_NAME || 'ats-runtime',
  volumePath: process.env.VOLUME_PATH || '/home/ats/files',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.apiToken || config.apiToken === 'your-api-token-change-in-production') {
  console.warn('⚠️  WARNING: Using default API_TOKEN. Change this in production!');
}

