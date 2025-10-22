import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Feedback } from './models/Feedback.js';

const app = express();

// CORS whitelist from env (comma-separated)
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow same-origin or curl/postman
      if (corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: false
  })
);
app.use(helmet());
app.use(express.json({ limit: '200kb' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// POST /api/feedback — save submission
app.post('/api/feedback', async (req, res) => {
  try {
    const body = req.body;

    // Basic shape validation
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: items[] required.' });
    }

    // Normalize and validate items
    const items = body.items.map((it, idx) => {
      const subject = (it.subject || '').toString().trim();
      const rating = Number(it.rating);
      const comments = (it.comments || '').toString();

      if (!subject) throw new Error(`Item ${idx + 1}: subject is required`);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new Error(`Item ${idx + 1}: rating must be 1-5`);
      }
      return { subject, rating, comments };
    });

    const doc = await Feedback.create({
      items,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined
    });

    return res.status(201).json({ id: doc._id.toString() });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'Failed to save feedback' });
  }
});

// Optional: list recent feedback (for testing)
app.get('/api/feedback', async (_req, res) => {
  const rows = await Feedback.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json(rows);
});

async function start() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'feedback_form';
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName });
  console.log(`Connected to MongoDB db="${dbName}"`);
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});