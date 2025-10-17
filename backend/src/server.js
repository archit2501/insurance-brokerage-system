import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { pool, runMigrations } from './db.js';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import banksRouter from './routes/banks.js';
import insurersRouter from './routes/insurers.js';
import agentsRouter from './routes/agents.js';
import lobsRouter from './routes/lobs.js';
import usersRouter from './routes/users.js';
import kycRouter from './routes/kyc.js';
import auditRouter from './routes/audit.js';
import policiesRouter from './routes/policies.js';
import notesRouter from './routes/notes.js';
import dispatchRouter from './routes/dispatch.js';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: '*'}));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

app.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT 1');
    res.json({ ok: true, db: rows[0]['?column?'] === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/banks', banksRouter);
app.use('/api/insurers', insurersRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/lobs', lobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/audit', auditRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/dispatch', dispatchRouter);

const port = process.env.PORT || 4000;
runMigrations().then(() => {
  app.listen(port, () => console.log(`IBMS backend listening on :${port}`));
}).catch(err => {
  console.error('Failed to run migrations', err);
  process.exit(1);
});