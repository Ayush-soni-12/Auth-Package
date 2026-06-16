# Express Advanced Auth

A complete, enterprise-grade Authentication package for Express applications. Stop writing the same boilerplate backend authentication code—just plug this package in and get full-featured, secure user authentication out of the box!

## 🚀 Features

- **Full Auth Flow:** Signup, Login, and Logout.
- **Two-Factor Authentication (2FA):** OTP-based login via email.
- **Email Verification:** Mandate users to verify their email before authenticating.
- **Password Recovery:** Secure Forget and Reset Password workflows using expiring tokens.
- **Social Login:** Built-in Google OAuth support.
- **Extremely Secure:** JWT token blacklisting on logout, securely hashed passwords (Bcrypt), and `httpOnly` secure cookies.
- **Database Agnostic:** Works with MongoDB out of the box, but you can plug in any database!
- **Cache Agnostic:** Uses fast In-Memory caching by default, with built-in Redis support.

---

## 📦 Installation

```bash
npm install express-advanced-auth
```
*(Note: Replace with your actual npm package name when published)*

---

## 🛠️ Quick Start (Backend Setup)

Setting up the authentication system in your Express server only takes a few lines of code.

### 1. Define your User Model (MongoDB example)
You maintain control over your database schema. Just ensure it has `email`, `password`, `isVerified`, `lastlogin`, and `googleId` fields.

```javascript
// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  isVerified: { type: Boolean, default: false },
  lastlogin: { type: Date, default: Date.now },
  authProvider: { type: String, default: "local" },
  googleId: { type: String, sparse: true }
});

export default mongoose.model("User", userSchema);
```

### 2. Initialize the Router in your `server.js`

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import User from './models/User.js';

// Import the package
import { 
  initAuth, 
  MongooseAdapter, 
  NodeMailerAdapter 
} from 'express-advanced-auth';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Setup the Authentication routes
const authRoutes = initAuth({
  frontendUrl: "http://localhost:3000",
  jwtSecret: "YOUR_SUPER_SECRET_KEY",
  
  // 1. Tell it how to talk to your database
  dbAdapter: new MongooseAdapter(User),
  
  // 2. Tell it how to send emails (SMTP config)
  emailAdapter: new NodeMailerAdapter(
    {
      service: "gmail",
      auth: {
        user: "your-email@gmail.com",
        pass: "your-app-password"
      }
    },
    "your-email@gmail.com" // From email
  )
});

// Mount the router!
app.use('/api/auth', authRoutes);

app.listen(8000, () => console.log('Server running on port 8000'));
```

That's it! Your backend now has 10 fully functioning secure endpoints.

---

## 🌐 Frontend API Guide

Your frontend (React, Vue, Next.js, etc.) will interact with the mounted `/api/auth` endpoints. All endpoints return predictable JSON and handle secure cookies automatically.

### 1. Signup
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
*Note: Sends a verification email to the user.*

### 2. Verify Email
`GET /api/auth/verifyEmail/:id`
*Usually called when the user clicks the link in their email. It automatically sets the authentication cookie and redirects them to your `frontendUrl/email-verified-success`.*

### 3. Login (Step 1: Request OTP)
`POST /api/auth/login`
**Body:**
```json
{
  "email": "ayush@example.com",
  "password": "Password123!"
}
```
**Response:** `userId` and confirmation that an OTP was sent to their email.

### 4. Verify OTP (Step 2: Complete Login)
`POST /api/auth/verifyLoginOtp/:id`
**Body:**
```json
{
  "otp": "481516"
}
```
*Sets the `httpOnly` secure cookie automatically upon success!*

### 5. Check Authentication State
`GET /api/auth/check-auth`
Call this on page load in your frontend to see if the user is currently logged in.
**Response:**
```json
{
  "isAuthenticated": true,
  "user": {
    "_id": "123...",
    "username": "Ayush",
    "email": "ayush@example.com"
  }
}
```

### 6. Forget Password
`POST /api/auth/forgotPassword`
**Body:** `{ "email": "ayush@example.com" }`

### 7. Reset Password
`POST /api/auth/resetPassword/:id/:token`
**Body:** `{ "password": "NewPassword123!" }`

### 8. Google OAuth
`POST /api/auth/google`
**Body:** `{ "token": "GOOGLE_ID_TOKEN_FROM_FRONTEND" }`
*Automatically signs up or logs in the user and sets the secure cookie.*

### 9. Logout
`POST /api/auth/logout`
*Clears the cookie and securely blacklists the JWT in the cache to prevent replay attacks.*

---

## ⚡ Advanced Configuration

### Using Redis instead of Memory
By default, the package uses RAM to store temporary OTPs. For production scale, simply pass a Redis client:

```javascript
import { RedisAdapter } from 'express-advanced-auth';
import { createClient } from 'redis';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

const authRoutes = initAuth({
  dbAdapter: new MongooseAdapter(User),
  emailAdapter: new NodeMailerAdapter(...),
  cacheAdapter: new RedisAdapter(redisClient) // <--- Add this!
});
```

### Using a Different Database (e.g., PostgreSQL / Prisma)
If you don't use MongoDB, you can easily plug in any database by extending the `DatabaseAdapter` interface!

```javascript
import { DatabaseAdapter, initAuth } from 'express-advanced-auth';
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

// Pass it into the setup!
app.use('/api/auth', initAuth({
  dbAdapter: new PrismaAdapter(),
  // ...other configs
}));
```

### Using a Different Email Provider (e.g., Resend)
Don't want to use NodeMailer? You can use Resend, SendGrid, or AWS SES by extending the `EmailAdapter` interface!

```javascript
import { EmailAdapter, initAuth } from 'express-advanced-auth';
import { Resend } from 'resend';

const resend = new Resend('re_123456789');

class ResendAdapter extends EmailAdapter {
  async sendMail(to, subject, htmlContent) {
    await resend.emails.send({
      from: 'Auth <onboarding@resend.dev>',
      to: to,
      subject: subject,
      html: htmlContent
    });
  }
}

// Pass it into the setup!
app.use('/api/auth', initAuth({
  emailAdapter: new ResendAdapter(),
  // ...other configs
}));
```
