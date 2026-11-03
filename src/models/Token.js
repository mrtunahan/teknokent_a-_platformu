const { Schema, model } = require('mongoose');

/** E-posta doğrulama, şifre sıfırlama ve firma daveti için tek kullanımlık token. */
const tokenSchema = new Schema(
  {
    type: { type: String, enum: ['email_verification', 'password_reset', 'invitation'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, lowercase: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    role: String,
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true },
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

module.exports = model('Token', tokenSchema);
