const { Schema, model } = require('mongoose');

/** Bir kartın bir firmaya gösterildiği an. Günlük kart limiti ve popülerlik sönümlemesi için kullanılır. */
const feedImpressionSchema = new Schema(
  {
    viewerCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    targetCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    day: { type: String, required: true }, // YYYY-MM-DD
    score: Number,
    ab: Number,
    ba: Number,
    reasons: [String],
    exploration: { type: Boolean, default: false },
  },
  { timestamps: true },
);

feedImpressionSchema.index({ viewerCompany: 1, day: 1, targetCompany: 1 }, { unique: true });
feedImpressionSchema.index({ targetCompany: 1, createdAt: -1 });
feedImpressionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

module.exports = model('FeedImpression', feedImpressionSchema);
