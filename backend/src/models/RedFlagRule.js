const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const redFlagRuleSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    version: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    conditions: { type: mongoose.Schema.Types.Mixed, required: true },
    tier: { type: String, default: 'emergency' },
    is_active: { type: Boolean, default: true },
    created_by: { type: String, default: null },
    reviewed_by: { type: String, default: null },
    rationale: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'created_at' },
    versionKey: false,
  }
);

redFlagRuleSchema.index({ version: 1, name: 1 }, { unique: true });
redFlagRuleSchema.index({ is_active: 1 });

module.exports = mongoose.model('RedFlagRule', redFlagRuleSchema);
