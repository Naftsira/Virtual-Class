import mongoose from 'mongoose';

const BanSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  bannedAt: { type: Date, default: Date.now },
});

BanSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export const Ban = mongoose.model('Ban', BanSchema);
