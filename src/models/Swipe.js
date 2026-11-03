const { Schema, model } = require('mongoose');
const { SWIPE_DIRECTIONS } = require('../constants');

/**
 * Kaydırma kaydı. `scoreAtTime` o anki uyum skorunu saklar: ileride ranking modelini eğitirken
 * "hangi skorla gösterildi, nasıl tepki verildi" verisi hazır olur.
 */
const swipeSchema = new Schema(
  {
    swiperCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    swiperUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    direction: { type: String, enum: SWIPE_DIRECTIONS, required: true },
    scoreAtTime: { type: Number, default: null },
    directional: { ab: Number, ba: Number },
    exploration: { type: Boolean, default: false },
    note: { type: String, maxlength: 300 }, // süper ilgi notu
  },
  { timestamps: true },
);

swipeSchema.index({ swiperCompany: 1, targetCompany: 1, createdAt: -1 });
swipeSchema.index({ targetCompany: 1, direction: 1 });
swipeSchema.index({ swiperCompany: 1, createdAt: -1 });

module.exports = model('Swipe', swipeSchema);
