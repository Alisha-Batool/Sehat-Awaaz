const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    phone: { type: String, trim: true, default: undefined, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, default: undefined, unique: true, sparse: true },
    password_hash: { type: String, select: false },
    email_verified: { type: Boolean, default: false },
    email_verification_token_hash: { type: String, select: false },
    email_verification_expires_at: { type: Date, select: false },
    password_reset_token_hash: { type: String, select: false },
    password_reset_expires_at: { type: Date, select: false },
    name: { type: String, trim: true, default: '' },
    preferred_language: { type: String, default: 'en' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

module.exports = mongoose.model('User', userSchema);
