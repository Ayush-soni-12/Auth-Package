import { MemoryCacheAdapter } from './adapters/MemoryCacheAdapter.js';

export const config = {
  dbAdapter: null,
  cacheAdapter: new MemoryCacheAdapter(), // default to memory cache
  emailAdapter: null,
  jwtSecret: process.env.JWT_SECRET || "default_secret",
  frontendUrl: process.env.FRONT_URL || "http://localhost:3000",
  googleClientId: null,

  /**
   * Optional: provide a custom Zod schema to replace the built-in signup validation.
   * Useful when your User model has extra required fields (e.g. phone, terms).
   *
   * @example
   * import { z } from 'zod';
   * initAuth({
   *   signupValidationSchema: z.object({
   *     body: z.object({ email: z.email(), password: z.string().min(8), phone: z.string() })
   *   }),
   *   ...
   * });
   */
  signupValidationSchema: null,
};

export const setConfig = (userConfig) => {
  Object.assign(config, userConfig);
};
