const { Schema, model } = require('mongoose');

/**
 * Her firma için önceden hesaplanmış aday kuyruğu (belgedeki Redis önbelleğinin MongoDB karşılığı).
 * Gece toplu iş ve profil güncellemeleri bu kuyruğu yeniden yazar; akış (feed) buradan okunur.
 */
const candidateSchema = new Schema(
  {
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    score: Number,
    ab: Number,
    ba: Number,
    reasons: [String],
  },
  { _id: false },
);

const candidateQueueSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
  candidates: [candidateSchema],
  computedAt: { type: Date, default: Date.now },
});

module.exports = model('CandidateQueue', candidateQueueSchema);
