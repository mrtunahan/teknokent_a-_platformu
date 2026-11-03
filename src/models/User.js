const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../constants');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: Object.values(ROLES), required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    technopark: { type: Schema.Types.ObjectId, ref: 'Technopark', default: null }, // teknokent yöneticisi için
    emailVerified: { type: Boolean, default: false },
    consents: {
      kvkkVersion: String,
      kvkkAcceptedAt: Date,
      marketing: { type: Boolean, default: false },
    },
    lastLoginAt: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(pw) {
  this.passwordHash = await bcrypt.hash(pw, 12);
};

userSchema.methods.checkPassword = function checkPassword(pw) {
  return bcrypt.compare(pw, this.passwordHash);
};

userSchema.methods.toJSON = function toJSON() {
  const o = this.toObject();
  delete o.passwordHash;
  delete o.__v;
  return o;
};

module.exports = model('User', userSchema);
