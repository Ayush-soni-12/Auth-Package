import { CacheAdapter } from './CacheAdapter.js';

export class MemoryCacheAdapter extends CacheAdapter {
  constructor() {
    super();
    this.cache = new Map();
  }

  async set(key, value, expiresInSeconds) {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = Date.now() + (expiresInSeconds * 1000);
    this.cache.set(key, { value: strValue, expiresAt });
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async del(key) {
    this.cache.delete(key);
  }
}
