const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const triageResultSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    session_id: { type: String, required: true, index: true },
    tier: { type: String, required: true },
    rule_id: { type: String, default: null },
    rationale: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    explanation: { type: String, default: '' },
    rule_version: { type: Number, default: null },
    model_version: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at' },
    versionKey: false,
  }
);

module.exports = mongoose.model('TriageResult', triageResultSchema);
