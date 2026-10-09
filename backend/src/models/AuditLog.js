const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    session_id: { type: String, default: null, index: true },
    action: { type: String, required: true },
    input_hash: { type: String, default: null },
    rule_path: { type: String, default: null },
    output_tier: { type: String, default: null },
    confidence: { type: Number, default: null },
    rule_version: { type: Number, default: null },
    model_version: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  }
);

auditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
