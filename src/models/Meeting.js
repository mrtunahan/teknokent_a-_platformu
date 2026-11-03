const { Schema, model } = require('mongoose');
const { MEETING_TYPES, MEETING_STATUSES } = require('../constants');

const meetingSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    proposedByUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Takvim slotu önerisi: karşı taraf bunlardan birini kabul eder
    proposedSlots: [{ type: Date }],
    startsAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 30, min: 10, max: 480 },
    type: { type: String, enum: MEETING_TYPES, default: 'online' },
    location: { type: String, trim: true, maxlength: 300 },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: MEETING_STATUSES, default: 'proposed' },
  },
  { timestamps: true },
);

meetingSchema.index({ match: 1 });
meetingSchema.index({ status: 1, startsAt: 1 });

module.exports = model('Meeting', meetingSchema);
