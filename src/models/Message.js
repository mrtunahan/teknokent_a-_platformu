const { Schema, model } = require('mongoose');

const messageSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    senderUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderCompany: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);

messageSchema.index({ match: 1, createdAt: -1 });

module.exports = model('Message', messageSchema);
