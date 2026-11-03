const { Schema, model } = require('mongoose');

const { ObjectId } = Schema.Types;

const matchSchema = new Schema(
  {
    // companyA < companyB (ObjectId string sıralaması) — çift başına tek kayıt
    companyA: { type: ObjectId, ref: 'Company', required: true },
    companyB: { type: ObjectId, ref: 'Company', required: true },
    score: { type: Number, default: 0 },
    reasons: { type: Schema.Types.Mixed, default: {} }, // { [companyId]: [gerekçe etiketleri] }
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    lastMessageAt: Date,
    firstMessageBy: { type: ObjectId, ref: 'Company', default: null },
    lastReadAt: { type: Map, of: Date, default: {} }, // companyId -> tarih
    outcomePromptSentAt: Date,
  },
  { timestamps: true },
);

matchSchema.index({ companyA: 1, companyB: 1 }, { unique: true });
matchSchema.index({ companyB: 1 });
matchSchema.index({ createdAt: 1 });

matchSchema.statics.orderPair = (x, y) => (String(x) < String(y) ? [x, y] : [y, x]);

matchSchema.methods.involves = function involves(companyId) {
  return String(this.companyA) === String(companyId) || String(this.companyB) === String(companyId);
};

matchSchema.methods.otherCompany = function otherCompany(companyId) {
  return String(this.companyA) === String(companyId) ? this.companyB : this.companyA;
};

module.exports = model('Match', matchSchema);
