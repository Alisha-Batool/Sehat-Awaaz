const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    user_id: { type: String, default: null, index: true },
    language: { type: String, default: 'en' },
    status: { type: String, default: 'active', index: true },
    symptom_profile: { type: mongoose.Schema.Types.Mixed, default: null },
    clarification_answers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    input_text: { type: String, default: '' },
    turn_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

sessionSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Session', sessionSchema);
