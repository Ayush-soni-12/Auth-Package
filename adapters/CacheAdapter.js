export class CacheAdapter {
  async set(key, value, expiresInSeconds) { throw new Error("Not implemented"); }
  async get(key) { throw new Error("Not implemented"); }
  async del(key) { throw new Error("Not implemented"); }
}
