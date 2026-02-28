require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const PgStore = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const argon2 = require('argon2');
const crypto = require('crypto');

const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;
if(!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.use(helmet());
app.use(express.json());

// CORS - allow frontend origin and credentials for cookie-based sessions
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8000';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

// Basic rate limiter for auth routes
const authLimiter = rateLimit({ windowMs: 60*1000, max: 10, message: 'Too many requests, try later.' });

// Session middleware with Postgres store
app.use(session({
  store: new PgStore({ pool }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Helpers
function generateToken(){ return crypto.randomBytes(32).toString('hex'); }
function hashToken(token){ return crypto.createHash('sha256').update(token).digest('hex'); }

// Register
app.post('/api/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body || {};
  if(!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const exists = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email.toLowerCase(), username]);
    if(exists.rowCount) return res.status(409).json({ error: 'User exists' });
    const hash = await argon2.hash(password);
    const r = await pool.query('INSERT INTO users (username,email,password_hash) VALUES ($1,$2,$3) RETURNING id,username,email,created_at', [username, email.toLowerCase(), hash]);
    req.session.userId = r.rows[0].id;
    res.json({ ok: true, user: r.rows[0] });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Login
app.post('/api/login', authLimiter, async (req, res) => {
  const { identifier, password } = req.body || {};
  if(!identifier || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const r = await pool.query('SELECT id,username,email,password_hash FROM users WHERE username=$1 OR email=$1', [identifier.toLowerCase()]);
    if(r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const u = r.rows[0];
    const ok = await argon2.verify(u.password_hash, password);
    if(!ok) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = u.id;
    res.json({ ok: true, user: { id: u.id, username: u.username, email: u.email } });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => { if(err) return res.status(500).json({ error: 'Logout failed' }); res.json({ ok: true }); });
});

// Me
app.get('/api/me', async (req, res) => {
  if(!req.session.userId) return res.json({ user: null });
  try{
    const r = await pool.query('SELECT id,username,email,created_at FROM users WHERE id=$1', [req.session.userId]);
    if(!r.rowCount) return res.json({ user: null });
    res.json({ user: r.rows[0] });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Mail transporter (initialized at startup)
let transporter = null;

async function createTransporter(){
  if(process.env.SMTP_HOST && process.env.SMTP_USER){
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: (process.env.SMTP_SECURE === 'true'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  // Use Ethereal test account for development if no SMTP configured
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

// Request password reset (creates token and sends email in dev/prod)
app.post('/api/request-password-reset', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if(!email) return res.status(400).json({ error: 'Missing email' });
  try{
    const r = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if(!r.rowCount) return res.json({ ok: true });
    const userId = r.rows[0].id;
    const token = generateToken();
    const th = hashToken(token);
    const expiresAt = new Date(Date.now() + 1000*60*60).toISOString();
    await pool.query('INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)', [userId, th, 'password_reset', expiresAt]);
    // Send reset email (dev: Ethereal; prod: real SMTP)
    try{
      if(!transporter) transporter = await createTransporter();
      const resetLink = `${FRONTEND_ORIGIN}/reset-password.html?token=${token}`;
      const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@edustart.local',
        to: email,
        subject: 'Сброс пароля — EduStart',
        text: `Для сброса пароля перейдите по ссылке: ${resetLink}`,
        html: `<p>Для сброса пароля нажмите <a href="${resetLink}">ссылку</a>.</p>`
      });
      // If using Ethereal, expose preview URL to response for developer convenience
      const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
      res.json({ ok: true, preview, message: preview ? 'Ethereal preview available' : 'Email sent' });
    }catch(err){
      console.error('Mail send error', err);
      // Fallback: return token for dev/testing
      res.json({ ok: true, token });
    }
  }catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Reset password using token
app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if(!token || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const th = hashToken(token);
    const r = await pool.query('SELECT id,user_id,expires_at,used FROM auth_tokens WHERE token_hash=$1 AND type=$2', [th, 'password_reset']);
    if(!r.rowCount) return res.status(400).json({ error: 'Invalid token' });
    const rec = r.rows[0];
    if(rec.used) return res.status(400).json({ error: 'Token used' });
    if(new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });
    const hash = await argon2.hash(password);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, rec.user_id]);
    await pool.query('UPDATE auth_tokens SET used=true WHERE id=$1', [rec.id]);
    res.json({ ok: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Initialize transporter and start server
async function init(){
  try{
    transporter = await createTransporter();
    console.log('Mail transporter ready');
  }catch(err){ console.warn('Could not initialize transporter', err); }
  app.listen(PORT, () => console.log(`Auth server listening on ${PORT}`));
}

init().catch(err => { console.error('Init failed', err); process.exit(1); });
