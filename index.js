import authRoutes from './routes/authRoutes.js';
import { setConfig } from './config.js';
import { DatabaseAdapter } from './adapters/DatabaseAdapter.js';
import { MongooseAdapter } from './adapters/MongooseAdapter.js';
import { CacheAdapter } from './adapters/CacheAdapter.js';
import { RedisAdapter } from './adapters/RedisAdapter.js';
import { MemoryCacheAdapter } from './adapters/MemoryCacheAdapter.js';
import { EmailAdapter } from './adapters/EmailAdapter.js';
import { NodeMailerAdapter } from './adapters/NodeMailerAdapter.js';

/**
 * Initializes the Authentication module with user configurations
 * 
 * @param {Object} options 
 * @param {DatabaseAdapter} options.dbAdapter - The database adapter (e.g. new MongooseAdapter(User))
 * @param {EmailAdapter} options.emailAdapter - The email adapter for sending OTPs and Links
 * @param {CacheAdapter} [options.cacheAdapter] - Cache adapter, defaults to MemoryCacheAdapter
 * @param {string} [options.jwtSecret] - Secret used to sign JWTs
 * @param {string} [options.frontendUrl] - URL of the frontend application
 * @returns {express.Router} Express Router containing all auth routes
 */
export const initAuth = (options) => {
    if (!options || !options.dbAdapter) {
        throw new Error("dbAdapter is required. Please provide a valid database adapter.");
    }
    if (!options.emailAdapter) {
        throw new Error("emailAdapter is required to send verification emails and OTPs.");
    }
    
    // Pass user options into global package configuration
    setConfig(options);
    
    // Return the routes so the user can mount it (e.g., app.use('/api/auth', initAuth(...)))
    return authRoutes;
};

// Export Adapters for developers to use
export {
    DatabaseAdapter,
    MongooseAdapter,
    CacheAdapter,
    RedisAdapter,
    MemoryCacheAdapter,
    EmailAdapter,
    NodeMailerAdapter
};
