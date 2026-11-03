const { Schema, model } = require('mongoose');
const { OUTCOME_RESULTS } = require('../constants');

/** Eşleşme sonrası iş sonucu — ileride ranking modelinin asıl hedef değişkeni. */
const outcomeSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, // beyan eden taraf
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    result: { type: String, enum: OUTCOME_RESULTS, required: true },
    estimatedValue: { type: Number, min: 0 },
    currency: { type: String, default: 'TRY' },
    feedback: { type: String, trim: true, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

outcomeSchema.index({ match: 1, company: 1 }, { unique: true });

module.exports = model('Outcome', outcomeSchema);
