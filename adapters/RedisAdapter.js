import { CacheAdapter } from './CacheAdapter.js';

export class RedisAdapter extends CacheAdapter {
  constructor(redisClient) {
    super();
    this.client = redisClient;
  }

  async set(key, value, expiresInSeconds) {
    // Converts values to strings if they aren't already, since Redis needs strings
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.setEx(key, expiresInSeconds, strValue);
  }

  async get(key) {
    return await this.client.get(key);
  }

  async del(key) {
    await this.client.del(key);
  }
}
