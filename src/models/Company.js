const { Schema, model } = require('mongoose');
const {
  EMPLOYEE_RANGES, STAGES, COLLABORATION_TYPES, URGENCY, NEED_VISIBILITY, REGION_PREFERENCES,
  CERTIFICATE_TYPES, VERIFICATION_STATUSES,
} = require('../constants');

const { ObjectId } = Schema.Types;

/** "Sunuyorum" maddesi: yetkinlik etiketi + iş birliği türü + kısa açıklama. */
const offerSchema = new Schema({
  tag: { type: ObjectId, ref: 'Tag', required: true },
  collaborationType: { type: String, enum: COLLABORATION_TYPES, required: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
});

/** "Arıyorum" maddesi: ihtiyaç etiketi + iş birliği türü + aciliyet + bütçe + görünürlük. */
const needSchema = new Schema({
  tag: { type: ObjectId, ref: 'Tag', required: true },
  collaborationType: { type: String, enum: COLLABORATION_TYPES, required: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  urgency: { type: String, enum: URGENCY, default: 'general' },
  budgetRange: { min: Number, max: Number, currency: { type: String, default: 'TRY' } },
  visibility: { type: String, enum: NEED_VISIBILITY, default: 'public' },
  expiresAt: { type: Date, default: null },
});

const certificateSchema = new Schema({
  type: { type: String, enum: CERTIFICATE_TYPES, required: true },
  title: { type: String, trim: true, default: '' },
  validUntil: { type: Date, default: null },
  document: {
    type: new Schema({
      key: { type: String, required: true },
      name: String,
      size: Number,
      contentType: String,
      uploadedAt: { type: Date, default: Date.now },
    }, { _id: false }),
    default: undefined,
  },
});

const referenceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  client: { type: String, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  hidden: { type: Boolean, default: false },
});

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    taxNumber: { type: String, required: true, unique: true, trim: true },
    logoUrl: { type: String, default: '' },
    logoKey: { type: String, default: '' }, // depolamadaki logo dosyası (yüklendiyse)
    website: { type: String, default: '' },
    emailDomain: { type: String, lowercase: true, trim: true, default: '' },
    foundedYear: { type: Number, min: 1900, max: 2100 },
    employeeRange: { type: String, enum: EMPLOYEE_RANGES },
    stage: { type: String, enum: STAGES },
    technopark: { type: ObjectId, ref: 'Technopark', required: true },
    city: { type: String, trim: true },
    branches: [{ technopark: { type: ObjectId, ref: 'Technopark' }, city: String }],
    sectors: [{ type: ObjectId, ref: 'Tag' }],
    technologies: [{ type: ObjectId, ref: 'Tag' }],
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    // Opsiyonel embedding servisi tarafından doldurulur (ihtiyaç ve yetkinlik metinlerinin vektörleri)
    embeddings: {
      type: new Schema({ needs: [Number], offers: [Number], model: String, updatedAt: Date }, { _id: false }),
      default: undefined,
      select: false,
    },
    certificates: [certificateSchema],
    references: [referenceSchema],
    offers: {
      type: [offerSchema],
      validate: [(v) => v.length <= 5, 'En fazla 5 "sunuyorum" maddesi eklenebilir.'],
    },
    needs: {
      type: [needSchema],
      validate: [(v) => v.length <= 5, 'En fazla 5 "arıyorum" maddesi eklenebilir.'],
    },

    preferences: {
      region: { type: String, enum: REGION_PREFERENCES, default: 'turkey' },
      requiredCertificates: [{ type: String, enum: CERTIFICATE_TYPES }],
      blockedSectors: [{ type: ObjectId, ref: 'Tag' }], // rakip olarak işaretlenen sektörler
    },
    blockedCompanies: [{ type: ObjectId, ref: 'Company' }],

    verification: {
      status: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
      reviewedBy: { type: ObjectId, ref: 'User' },
      reviewedAt: Date,
      note: String,
    },
    /** Teknokent yönetimi tarafından toplu yüklenen, henüz sahiplenilmemiş profil. */
    prefilled: { type: Boolean, default: false },
    underReview: { type: Boolean, default: false }, // 3+ rapor sonrası
    active: { type: Boolean, default: true },

    stats: {
      impressions7d: { type: Number, default: 0 },
      positiveOutcomes: { type: Number, default: 0 },
      totalOutcomes: { type: Number, default: 0 },
    },
    profileUpdatedAt: { type: Date, default: Date.now },
    queueStale: { type: Boolean, default: true },
  },
  { timestamps: true },
);

companySchema.index({ technopark: 1, 'verification.status': 1 });
companySchema.index({ 'offers.tag': 1 });
companySchema.index({ 'needs.tag': 1 });

/** Profil tamamlama yüzdesi (0-100) ve eksik alanlar. */
companySchema.methods.completion = function completion() {
  const checks = [
    ['name', !!this.name],
    ['logoUrl', !!this.logoUrl],
    ['foundedYear', !!this.foundedYear],
    ['employeeRange', !!this.employeeRange],
    ['stage', !!this.stage],
    ['sectors', this.sectors?.length > 0],
    ['technologies', this.technologies?.length > 0],
    ['description', (this.description || '').length >= 80],
    ['offers', this.offers?.length > 0],
    ['needs', this.needs?.length > 0],
    ['certificates', this.certificates?.length > 0],
    ['references', this.references?.length > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([k]) => k),
  };
};

companySchema.methods.isDiscoverable = function isDiscoverable() {
  return this.active && !this.underReview && this.verification?.status === 'approved' && !this.prefilled;
};

module.exports = model('Company', companySchema);
