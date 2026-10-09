const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const facilitySchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    type: { type: String, default: 'healthcare facility' },
    province: { type: String, default: null },
    district: { type: String, default: null },
    address: { type: String, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    phone: { type: String, default: null },
    emergency_capable: { type: Boolean, default: false },
    last_verified: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at' },
    versionKey: false,
  }
);

facilitySchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model('Facility', facilitySchema);
