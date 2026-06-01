import mongoose from 'mongoose';

const WhiteboardStateSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  objects: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export const WhiteboardState = mongoose.model('WhiteboardState', WhiteboardStateSchema);
