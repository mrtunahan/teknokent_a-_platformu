const { Schema, model } = require('mongoose');
const { TAG_TYPES } = require('../constants');

const tagSchema = new Schema(
  {
    type: { type: String, enum: TAG_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Tag', default: null },
  },
  { timestamps: true },
);

tagSchema.index({ type: 1, slug: 1 }, { unique: true });

module.exports = model('Tag', tagSchema);
