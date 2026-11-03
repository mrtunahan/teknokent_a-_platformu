const { Schema, model } = require('mongoose');

const reportSchema = new Schema(
  {
    reporterCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    reporterUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    reason: { type: String, enum: ['spam', 'fake_profile', 'inappropriate', 'sales_pitch', 'other'], required: true },
    details: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true },
);

reportSchema.index({ reporterCompany: 1, targetCompany: 1 }, { unique: true });
reportSchema.index({ targetCompany: 1, status: 1 });

module.exports = model('Report', reportSchema);
