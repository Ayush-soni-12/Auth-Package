import authRoutes from './routes/authRoutes.js';
import { setConfig } from './config.js';
import { DatabaseAdapter } from './adapters/DatabaseAdapter.js';
import { MongooseAdapter } from './adapters/MongooseAdapter.js';
import { CacheAdapter } from './adapters/CacheAdapter.js';
import { RedisAdapter } from './adapters/RedisAdapter.js';
import { MemoryCacheAdapter } from './adapters/MemoryCacheAdapter.js';
import { EmailAdapter } from './adapters/EmailAdapter.js';
import { NodeMailerAdapter } from './adapters/NodeMailerAdapter.js';
import { createUserModel, baseUserSchemaFields } from './modals/User.js';

import { verifyToken } from './helpers/validateToken.js';
import { requireRole } from './middlewares/roleMiddleware.js';

/**
 * Initializes the Authentication module with user configurations.
 *
 * @param {Object} options
 * @param {DatabaseAdapter} options.dbAdapter              - Database adapter (e.g. new MongooseAdapter(User))
 * @param {EmailAdapter}    options.emailAdapter           - Email adapter for OTPs and links
 * @param {CacheAdapter}    [options.cacheAdapter]         - Cache adapter (default: MemoryCacheAdapter)
 * @param {string}          [options.jwtSecret]            - Secret used to sign JWTs
 * @param {string}          [options.frontendUrl]          - URL of the frontend application
 * @param {Object}          [options.signupValidationSchema] - Custom Zod schema to replace built-in signup validation
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
    NodeMailerAdapter,
    verifyToken,
    requireRole,
    // Model utilities — let consumers build and extend their own User schema
    createUserModel,
    baseUserSchemaFields,
};
