const { Schema, model } = require('mongoose');

const technoparkSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    city: { type: String, required: true, trim: true },
    licenseStatus: { type: String, enum: ['pilot', 'active', 'expired', 'none'], default: 'pilot' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = model('Technopark', technoparkSchema);
