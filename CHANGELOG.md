# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-30

### Added
- **Role-Based Access Control (RBAC):** Added `requireRole` middleware to easily secure specific API routes based on user roles (e.g. `requireRole('admin', 'moderator')`).
- Exported `verifyToken` and `requireRole` in the main package entrypoint (`index.js`), giving developers full control to protect their own application's backend routes.
- Fully dynamic role integration: Developers can define custom role `enum` fields in their own Mongoose models without package-level restrictions.

## [1.0.0] - 2026-06-16

### Added
- Initial release of `neural-auth`.
- Fully modular Authentication API with 10 secure endpoints.
- Dependency Injection architecture using the **Adapter Pattern** (`DatabaseAdapter`, `EmailAdapter`, `CacheAdapter`).
- Pre-built `MongooseAdapter` for quick MongoDB integration.
- Pre-built `NodeMailerAdapter` for email delivery.
- Fallback `MemoryCacheAdapter` for development environments without Redis.
- Advanced Cookie Security with `httpOnly`, `secure`, and `sameSite` configuration.
- "Sign in with Google" integration using Identity Tokens (Implicit Flow).
- Bonus `examples/react-query-hooks.ts` with fully typed frontend integrations.

### Security
- Robust Password reset workflow using URL parameters `/:id/:token` to prevent cross-device local storage issues.
- Integrated `zod` validation middleware for all authentication schemas.
- JWT blacklisting mechanism to defend against replay attacks post-logout.
