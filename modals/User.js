import mongoose from "mongoose";

/**
 * The base schema fields required by neural-auth internally.
 * You can merge these with your own fields to extend the user schema.
 *
 * @example
 * import { baseUserSchemaFields } from 'neural-auth';
 * const schema = new mongoose.Schema({ ...baseUserSchemaFields, phone: String });
 */
export const baseUserSchemaFields = {
  username: {
    type: String,
    // Optional — some apps use email as the only identifier.
    // Set required: true in extraFields if your app needs it.
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
    required: function () {
      return this.authProvider === "local";
    },
  },
  // Open string — no enum lock. Allows 'local', 'google', 'github',
  // 'apple', or any custom provider without DB migrations.
  authProvider: {
    type: String,
    default: "local",
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    default: "user",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastlogin: {
    type: Date,
    default: Date.now,
  },
  // resetPasswordToken & resetPasswordExpires intentionally removed —
  // the package uses cache (Redis/Memory) for reset tokens, not the DB.
};

/**
 * Factory function to create a Mongoose User model.
 * Pass extra fields to extend the base auth schema with your app's needs.
 *
 * @param {Object} extraFields     Additional Mongoose schema field definitions
 * @param {Object} schemaOptions   Additional Mongoose schema options (merged with defaults)
 * @returns {mongoose.Model}       A compiled Mongoose model named "User"
 *
 * @example — basic usage
 * import { createUserModel } from 'neural-auth';
 * const User = createUserModel();
 *
 * @example — with custom fields
 * import { createUserModel } from 'neural-auth';
 * const User = createUserModel({
 *   phone:        { type: String },
 *   avatar:       { type: String },
 *   subscription: { type: String, default: 'free' },
 * });
 *
 * @example — override a base field (e.g. make username required)
 * import { createUserModel, baseUserSchemaFields } from 'neural-auth';
 * const User = createUserModel({
 *   username: { ...baseUserSchemaFields.username, required: true },
 * });
 */
export const createUserModel = (extraFields = {}, schemaOptions = {}) => {
  const schema = new mongoose.Schema(
    { ...baseUserSchemaFields, ...extraFields },
    { timestamps: true, ...schemaOptions }
  );
  return mongoose.model("User", schema);
};
