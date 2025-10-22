import mongoose from 'mongoose';

const FeedbackItemSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String, default: '' }
  },
  { _id: false }
);

const FeedbackSchema = new mongoose.Schema(
  {
    items: {
      type: [FeedbackItemSchema],
      validate: v => Array.isArray(v) && v.length > 0
    },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Feedback = mongoose.model('Feedback', FeedbackSchema);