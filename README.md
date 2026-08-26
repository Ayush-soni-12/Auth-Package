# neural-auth

A complete, enterprise-grade Authentication package for Express applications. Stop writing the same boilerplate backend authentication code — just plug this package in and get full-featured, secure user authentication out of the box, with a schema you fully control.

## 🚀 Features

- **Extensible User Schema:** Use `createUserModel()` to add any custom fields (`phone`, `avatar`, `subscription`, etc.) — no forking required.
- **Full Auth Flow:** Signup, Login, and Logout.
- **Role-Based Access Control (RBAC):** Built-in middleware to protect admin/manager routes dynamically.
- **Two-Factor Authentication (2FA):** OTP-based login via email.
- **Email Verification:** Mandate users to verify their email before authenticating.
- **Password Recovery:** Secure Forget and Reset Password workflows using expiring cache tokens.
- **Social Login:** Built-in Google OAuth support — extensible to any provider.
- **Extremely Secure:** JWT token blacklisting on logout, securely hashed passwords (Bcrypt), and `httpOnly` secure cookies.
- **Database Agnostic:** Works with MongoDB out of the box, but you can plug in any database.
- **Cache Agnostic:** Uses fast In-Memory caching by default, with built-in Redis support.

---

## 📦 Installation

```bash
npm install neural-auth
```

---

## 🛠️ Quick Start (Backend Setup)

### 1. Create Your User Model

The package exports a `createUserModel()` factory. Call it with **no arguments** for a minimal setup, or pass your own extra fields to extend the schema.

```javascript
// models/User.js
import { createUserModel } from 'neural-auth';

// ✅ Minimal — only base auth fields (email, password, role, isVerified, etc.)
const User = createUserModel();

export default User;
```

**Or extend it with your own fields:**

```javascript
// models/User.js
import { createUserModel } from 'neural-auth';

const User = createUserModel({
  // Add any fields your app needs
  phone:        { type: String },
  avatar:       { type: String },
  subscription: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  address:      { type: String },
});

export default User;
```

> **What's in the base schema?**
> `username`, `email`, `password` (select: false), `authProvider`, `googleId`, `role`, `isVerified`, `lastlogin`, `createdAt`, `updatedAt`.

> **Need even more control?** Use `baseUserSchemaFields` to compose manually:
> ```javascript
> import { baseUserSchemaFields } from 'neural-auth';
> import mongoose from 'mongoose';
>
> // Override a base field — e.g. make username required
> const schema = new mongoose.Schema({
>   ...baseUserSchemaFields,
>   username: { type: String, required: true },
>   phone: { type: String },
> }, { timestamps: true });
>
> export default mongoose.model('User', schema);
> ```

---

### 2. Initialize the Router in Your `server.js`

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import User from './models/User.js';

import {
  initAuth,
  MongooseAdapter,
  NodeMailerAdapter
} from 'neural-auth';

const app = express();
app.use(express.json());
app.use(cookieParser());

await mongoose.connect(process.env.MONGO_URI);

app.use('/api/auth', initAuth({
  // 1. Database adapter — pass your User model
  dbAdapter: new MongooseAdapter(User),

  // 2. Email adapter — for verification emails, OTPs, reset links
  emailAdapter: new NodeMailerAdapter(
    {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    },
    'your-email@gmail.com'
  ),

  // 3. Optional config
  jwtSecret:    process.env.JWT_SECRET,
  frontendUrl:  process.env.FRONTEND_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,  // Required for Google Login
  cookieSecure: process.env.NODE_ENV === 'production',
}));

app.listen(8000, () => console.log('Server running on port 8000'));
```

That's it! Your backend now has **10 fully functioning, secure auth endpoints**.

---

### 3. Protecting Routes (RBAC)

Use the built-in `verifyToken` and `requireRole` middlewares to protect any route:

```javascript
import { verifyToken, requireRole } from 'neural-auth';

// Requires login
app.get('/api/profile', verifyToken, (req, res) => {
  // req.user is the full user object from your DB
  res.json({ user: req.user });
});

// Requires login + specific role
app.get('/api/admin/dashboard', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});

// Multiple allowed roles
app.get('/api/manage', verifyToken, requireRole('admin', 'manager', 'moderator'), (req, res) => {
  res.json({ message: 'Welcome!' });
});
```

---

### 4. Adding Custom Logic for Extra Fields

The package handles **auth only**. For any custom field logic (e.g., phone verification, avatar upload, profile updates), write your own controllers and reuse `verifyToken`:

```javascript
// controllers/profileController.js — your own file, outside the package
import { verifyToken } from 'neural-auth';
import User from './models/User.js';

// Update phone or avatar
router.put('/profile', verifyToken, async (req, res) => {
  const { phone, avatar, subscription } = req.body;

  // verifyToken sets req.user — use it directly
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { phone, avatar, subscription },
    { new: true }
  );

  res.json({ user: updatedUser });
});
```

> **Any field sent during signup is automatically passed through to `createUser`.** So if your schema has `phone` and the user sends it in the signup body, it will be saved automatically — no extra controller code needed for that case.

---

## 🌐 API Endpoints Reference

All endpoints mount under the path you provide to `app.use()`.

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Create account. Sends verification email. |
| `GET` | `/verifyEmail/:id` | Verify email via link. Sets auth cookie, redirects to frontend. |
| `POST` | `/login` | Step 1 of login. Validates credentials, sends OTP. |
| `POST` | `/verifyLoginOtp/:id` | Step 2 of login. Validates OTP, sets auth cookie. |
| `POST` | `/resendOtp/:id` | Resend login OTP. |
| `POST` | `/forgotPassword` | Sends password reset link to email. |
| `POST` | `/resetPassword/:id/:token` | Resets password using link token. |
| `POST` | `/google` | Google OAuth — signup or login. |
| `POST` | `/logout` | Clears cookie and blacklists JWT in cache. |
| `GET` | `/check-auth` | Returns current user if authenticated. |

---

### Signup
`POST /api/auth/signup`

**Body:**
```json
{
  "username": "Ayush",
  "email": "ayush@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

- `username` is **optional** — only required if your schema marks it required.
- Any extra fields your schema defines (e.g. `phone`) can also be sent here and will be saved automatically.

---

### Login (Step 1)
`POST /api/auth/login`

**Body:**
```json
{
  "email": "ayush@example.com",
  "password": "Password123!"
}
```

**Response:** Returns `userId` and confirmation that an OTP was sent.

---

### Verify OTP (Step 2)
`POST /api/auth/verifyLoginOtp/:id`

**Body:**
```json
{ "otp": "481516" }
```

Sets the `httpOnly` secure cookie automatically on success.

---

### Check Auth
`GET /api/auth/check-auth`

Requires: `Token` cookie or `Authorization: Bearer <token>` header.

**Response:**
```json
{
  "isAuthenticated": true,
  "user": {
    "_id": "...",
    "username": "Ayush",
    "email": "ayush@example.com",
    "role": "user"
  }
}
```

---

### Forget Password
`POST /api/auth/forgotPassword`

**Body:** `{ "email": "ayush@example.com" }`

---

### Reset Password
`POST /api/auth/resetPassword/:id/:token`

**Body:** `{ "password": "NewPassword123!" }`

---

### Google OAuth
`POST /api/auth/google`

**Body:** `{ "token": "GOOGLE_ID_TOKEN_FROM_FRONTEND" }`

Automatically signs up or logs in the user and sets the secure cookie.

---

### Logout
`POST /api/auth/logout`

Clears the cookie and blacklists the JWT so it can't be reused.

---

## 🎁 Bonus: Free Frontend React Hooks!

We've included production-ready React Query hooks for all endpoints. Copy the file from:

```
node_modules/neural-auth/examples/react-query-hooks.ts
```

Includes: `useLoginMutation`, `useVerifyOtpMutation`, `useCheckAuth`, `useGoogleAuth`, and more.

---

## ⚠️ Common Frontend Integration Gotchas

### 1. Handling the User ID
The returned ID may be `_id` (Mongoose) instead of `id`. Always check both:
```javascript
const userId = data.user._id || data.userId || data.user.id;
localStorage.setItem('id', userId);
```

### 2. Don't clear localStorage during OTP Verification
If your API interceptor clears `localStorage` on `401` responses, **exclude the OTP verification step** — the user isn't fully authenticated yet so the server will naturally return `401`. Clearing localStorage at this point will delete the temporary `id` needed to submit the OTP.

### 3. Evaluate localStorage dynamically
Read `localStorage.getItem('id')` at the moment the user clicks Submit — not when the component mounts:
```javascript
const submitOtp = async (otp) => {
  const id = localStorage.getItem('id'); // Get freshest ID at execution time
  await api.post(`/verifyLoginOtp/${id}`, { otp });
};
```

### 4. Password Reset URL Parameters
The reset link sends the user to `/resetPassword/ID/TOKEN`. **Read both values from the URL** (not localStorage) — the user may have requested the reset on one device and opened the link on another.

---

## ⚡ Advanced Configuration

### Custom Signup Validation
If your User model has required custom fields (e.g. `phone`), replace the built-in Zod signup schema:

```javascript
import { z } from 'zod';

app.use('/api/auth', initAuth({
  dbAdapter: new MongooseAdapter(User),
  emailAdapter: new NodeMailerAdapter(...),

  // Your Zod schema — must use { body: z.object({...}) } shape
  signupValidationSchema: z.object({
    body: z.object({
      username: z.string().min(2).max(50).optional(),
      email:    z.email(),
      password: z.string().min(8),
      confirmPassword: z.string(),
      phone:    z.string().min(10, 'Phone number required'), // custom field
    }),
  }),
}));
```


---

### Using Redis Instead of Memory Cache
For production scale, pass a Redis client to store OTPs and reset tokens:

```javascript
import { RedisAdapter } from 'neural-auth';
import { createClient } from 'redis';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

app.use('/api/auth', initAuth({
  dbAdapter:    new MongooseAdapter(User),
  emailAdapter: new NodeMailerAdapter(...),
  cacheAdapter: new RedisAdapter(redisClient),  // <-- swap in Redis
}));
```

---

### Using a Different Database (e.g., PostgreSQL / Prisma)
Extend the `DatabaseAdapter` interface to plug in any database:

```javascript
import { DatabaseAdapter, initAuth } from 'neural-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class PrismaAdapter extends DatabaseAdapter {
  async getUserByEmail(email) {
    return await prisma.user.findUnique({ where: { email } });
  }
  async getUserByEmailWithPassword(email) {
    return await prisma.user.findUnique({ where: { email } });
  }
  async getUserById(id) {
    return await prisma.user.findUnique({ where: { id } });
  }
  async createUser(userData) {
    return await prisma.user.create({ data: userData });
  }
  async updateUser(id, updateData) {
    return await prisma.user.update({ where: { id }, data: updateData });
  }
}

app.use('/api/auth', initAuth({
  dbAdapter: new PrismaAdapter(),
  emailAdapter: new NodeMailerAdapter(...),
}));
```

---

### Using a Different Email Provider (e.g., Resend)
Extend the `EmailAdapter` interface to use Resend, SendGrid, AWS SES, or any provider:

```javascript
import { EmailAdapter, initAuth } from 'neural-auth';
import { Resend } from 'resend';

const resend = new Resend('re_123456789');

class ResendAdapter extends EmailAdapter {
  async sendMail(to, subject, htmlContent) {
    await resend.emails.send({
      from: 'Auth <onboarding@resend.dev>',
      to,
      subject,
      html: htmlContent,
    });
  }
}

app.use('/api/auth', initAuth({
  dbAdapter:    new MongooseAdapter(User),
  emailAdapter: new ResendAdapter(),
}));
```

---

## 📋 Full `initAuth` Options Reference

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `dbAdapter` | `DatabaseAdapter` | ✅ | — | Database adapter instance |
| `emailAdapter` | `EmailAdapter` | ✅ | — | Email adapter instance |
| `cacheAdapter` | `CacheAdapter` | ❌ | `MemoryCacheAdapter` | Cache adapter for OTPs and tokens |
| `jwtSecret` | `string` | ❌ | `process.env.JWT_SECRET` | JWT signing secret |
| `frontendUrl` | `string` | ❌ | `http://localhost:3000` | Frontend URL for redirects and reset links |
| `googleClientId` | `string` | ❌ | `null` | Google OAuth Client ID |
| `cookieSecure` | `boolean` | ❌ | `NODE_ENV === 'production'` | Force HTTPS-only cookies |
| `signupValidationSchema` | `ZodSchema` | ❌ | built-in | Custom Zod schema for signup validation |

---

## 📤 Full Exports Reference

```javascript
import {
  // Core
  initAuth,

  // Model utilities
  createUserModel,        // Factory to create an extensible User model
  baseUserSchemaFields,   // Raw schema field definitions (for manual composition)

  // Database Adapters
  DatabaseAdapter,        // Base class to extend for custom DB
  MongooseAdapter,        // Built-in MongoDB adapter

  // Cache Adapters
  CacheAdapter,           // Base class to extend for custom cache
  MemoryCacheAdapter,     // Built-in in-memory cache (default)
  RedisAdapter,           // Built-in Redis adapter

  // Email Adapters
  EmailAdapter,           // Base class to extend for custom email provider
  NodeMailerAdapter,      // Built-in NodeMailer adapter

  // Middlewares
  verifyToken,            // JWT verification middleware
  requireRole,            // Role-based access control middleware
} from 'neural-auth';
```

---

## 🧩 Complete Real-World Example

This is a single, self-contained example of a **SaaS app** that uses every feature of the package together. Read through it top to bottom — each file explains what it does and why.

---

### Project Structure
```
my-app/
├── models/
│   └── User.js          ← Your custom User model (uses neural-auth)
├── controllers/
│   └── profileController.js  ← Your own logic for custom fields
├── routes/
│   └── profileRoutes.js
├── server.js
└── .env
```

---

### Step 1 — `models/User.js`

This example uses **`baseUserSchemaFields`** directly (instead of `createUserModel`) because we need:
- A **pre-save hook** to auto-format the phone number
- A **custom instance method** to get the full display name
- A **custom index** on `phone`

```javascript
// models/User.js
import mongoose from 'mongoose';
import { baseUserSchemaFields } from 'neural-auth';

// 1️⃣ Spread baseUserSchemaFields — this already includes:
//    username (optional), email, password, authProvider, googleId,
//    role, isVerified, lastlogin, createdAt, updatedAt
const userSchema = new mongoose.Schema(
  {
    ...baseUserSchemaFields,

    // ✏️ Override an existing base field — username already exists in
    //    baseUserSchemaFields as optional. We re-declare it here ONLY
    //    because our app wants to make it required. If optional is fine,
    //    remove this line — username is already included via the spread.
    username: { type: String, required: true },

    // ✅ These are truly NEW fields — not in baseUserSchemaFields at all
    phone:        { type: String },
    avatar:       { type: String, default: '' },
    subscription: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    bio:          { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

// 2️⃣ Pre-save hook — strip non-numeric characters from phone before saving
userSchema.pre('save', function (next) {
  if (this.phone) {
    this.phone = this.phone.replace(/\D/g, '');
  }
  next();
});

// 3️⃣ Custom instance method — used in our own profile controller
userSchema.methods.getDisplayName = function () {
  return this.username || this.email;
};

// 4️⃣ Custom index — fast lookup by phone, but optional (sparse)
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);
export default User;
```

> 💡 **If you don't need hooks or methods**, replace all of the above with one line:
> ```javascript
> import { createUserModel } from 'neural-auth';
>
> // Pass ONLY the fields you want to ADD or OVERRIDE.
> // username, email, password, role, isVerified, lastlogin etc.
> // are already included automatically — no need to repeat them.
> const User = createUserModel({
>   // Override: make username required (it's optional by default)
>   username: { type: String, required: true },
>
>   // New custom fields your app needs
>   phone:        { type: String },
>   avatar:       { type: String, default: '' },
>   subscription: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
>   bio:          { type: String, maxlength: 300 },
> });
> export default User;
> ```

---

### Step 2 — `server.js`

```javascript
// server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { z } from 'zod';

import {
  initAuth,
  MongooseAdapter,
  NodeMailerAdapter,
  RedisAdapter,
} from 'neural-auth';

import User from './models/User.js';
import profileRoutes from './routes/profileRoutes.js';
import { createClient } from 'redis';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Connect DB
await mongoose.connect(process.env.MONGO_URI);

// Connect Redis (for production-grade OTP/token storage)
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// 5️⃣ Custom Zod signup schema — because our app requires 'phone' at signup
//    and we want stricter username rules than the built-in default.
const mySignupSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(2, 'Username must be at least 2 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, underscores'),

    email: z.email('Please enter a valid email'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),

    confirmPassword: z.string(),

    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .optional(),       // optional at signup, required later in profile
  }),
});

// 6️⃣ Mount the auth package — wire in every option
app.use('/api/auth', initAuth({
  // Required
  dbAdapter:    new MongooseAdapter(User),
  emailAdapter: new NodeMailerAdapter(
    {
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    },
    process.env.EMAIL_USER
  ),

  // Optional — Redis instead of in-memory cache
  cacheAdapter: new RedisAdapter(redis),

  // Optional — app config
  jwtSecret:      process.env.JWT_SECRET,
  frontendUrl:    process.env.FRONTEND_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  cookieSecure:   process.env.NODE_ENV === 'production',

  // Optional — override built-in signup validation with ours
  signupValidationSchema: mySignupSchema,
}));

// 7️⃣ Mount our own custom routes (profile, etc.)
app.use('/api/profile', profileRoutes);

app.listen(8000, () => console.log('🚀 Server running on port 8000'));
```

---

### Step 3 — `controllers/profileController.js`

The package handles **auth only**. All business logic for custom fields lives here, in your own controller. Notice we reuse `verifyToken` and `requireRole` from the package — we don't need to re-implement them.

```javascript
// controllers/profileController.js
import User from '../models/User.js';

// GET /api/profile/me
// Returns the logged-in user's full profile
export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Use our custom instance method defined in the schema
    return res.json({
      displayName: user.getDisplayName(),
      profile: user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile/me
// Update custom fields — phone, avatar, bio, subscription
export const updateProfile = async (req, res) => {
  try {
    const { phone, avatar, bio, subscription } = req.body;

    // Only update fields that were actually sent
    const updates = {};
    if (phone !== undefined)        updates.phone = phone;
    if (avatar !== undefined)       updates.avatar = avatar;
    if (bio !== undefined)          updates.bio = bio;
    if (subscription !== undefined) updates.subscription = subscription;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    return res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/admin/users
// Admin-only: list all users
export const listAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile/admin/users/:id/subscription
// Admin-only: upgrade a user's subscription
export const upgradeSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { subscription },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ message: 'Subscription updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
```

---

### Step 4 — `routes/profileRoutes.js`

```javascript
// routes/profileRoutes.js
import express from 'express';
import { verifyToken, requireRole } from 'neural-auth';  // reuse package middlewares
import {
  getProfile,
  updateProfile,
  listAllUsers,
  upgradeSubscription,
} from '../controllers/profileController.js';

const router = express.Router();

// 8️⃣ Protected routes — verifyToken sets req.user
router.get('/me', verifyToken, getProfile);
router.put('/me', verifyToken, updateProfile);

// 9️⃣ Admin-only routes — requireRole must come AFTER verifyToken
router.get('/admin/users', verifyToken, requireRole('admin'), listAllUsers);
router.put('/admin/users/:id/subscription', verifyToken, requireRole('admin'), upgradeSubscription);

export default router;
```

---

### `.env` reference

```
MONGO_URI=mongodb://localhost:27017/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key
EMAIL_USER=yourapp@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
NODE_ENV=development
```

---

### What This Example Covers

| Feature | Where |
|---|---|
| `baseUserSchemaFields` for full schema control | `models/User.js` |
| Pre-save hook on custom field (`phone`) | `models/User.js` |
| Custom instance method (`getDisplayName`) | `models/User.js` |
| Custom index | `models/User.js` |
| `createUserModel` (simpler alternative) | `models/User.js` (comment) |
| `RedisAdapter` for production cache | `server.js` |
| `signupValidationSchema` with custom rules | `server.js` |
| `googleClientId` for Google Login | `server.js` |
| Custom controller for extra fields | `controllers/profileController.js` |
| `verifyToken` reused in custom routes | `routes/profileRoutes.js` |
| `requireRole` for admin-only routes | `routes/profileRoutes.js` |
