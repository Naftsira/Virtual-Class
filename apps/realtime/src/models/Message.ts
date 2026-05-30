import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
  },
  content: { type: String, required: true },
}, { timestamps: true });

export const Message = mongoose.model('Message', MessageSchema);
