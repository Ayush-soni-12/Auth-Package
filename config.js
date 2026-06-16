import { MemoryCacheAdapter } from './adapters/MemoryCacheAdapter.js';

export const config = {
  dbAdapter: null,
  cacheAdapter: new MemoryCacheAdapter(), // default to memory cache
  emailAdapter: null,
  jwtSecret: process.env.JWT_SECRET || "default_secret",
  frontendUrl: process.env.FRONT_URL || "http://localhost:3000",
  googleClientId: null,
};

export const setConfig = (userConfig) => {
  Object.assign(config, userConfig);
};
