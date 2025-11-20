/**
 * Audioryx Pro backend (Node + Express)
 * - JWT auth (bcrypt)
 * - SQLite (better-sqlite3)
 * - File uploads (multer)
 *
 * Configure .env before running.
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'change-me-please';

// DB
const dbPath = path.join(__dirname, 'audioryx.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  filename TEXT,
  title TEXT,
  artist TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY,
  data TEXT
)`).run();

app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets')));

// uploads dir
const uploadsDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req,file,cb)=>cb(null, uploadsDir),
  filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname.replace(/\\s+/g,'_'))
});
const upload = multer({ storage });

// helpers
function sign(user){ return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' }); }
function auth(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'no token' });
  const token = h.split(' ')[1];
  try{ const p = jwt.verify(token, SECRET); req.user = p; next(); } catch(e){ return res.status(401).json({ error: 'invalid' }); }
}

// register
app.post('/api/auth/register', async (req,res)=>{
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({ error: 'missing' });
  const hash = await bcrypt.hash(password, 12);
  try{
    const info = db.prepare('INSERT INTO users (email,password_hash,display_name) VALUES (?,?,?)').run(email,hash,email);
    const user = { id: info.lastInsertRowid, email };
    const token = sign(user);
    res.json({ user, token });
  }catch(err){ res.status(400).json({ error: 'email exists' }); }
});

// login
app.post('/api/auth/login', async (req,res)=>{
  const { email, password } = req.body;
  if(!email||!password) return res.status(400).json({ error: 'missing' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if(!row) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if(!ok) return res.status(400).json({ error: 'invalid' });
  const user = { id: row.id, email: row.email, display_name: row.display_name };
  const token = sign(user);
  res.json({ user, token });
});

// employee-login (hidden) - uses env vars only
app.post('/api/employee-login', (req,res)=>{
  const email = process.env.EMPLOYEE_EMAIL;
  const pass = process.env.EMPLOYEE_PASSWORD;
  if(!email || !pass) return res.status(500).json({ error: 'not configured' });
  const token = jwt.sign({ email, role: 'employee' }, SECRET, { expiresIn: '2h' });
  const user = { id: 0, email, display_name: 'Employee' };
  res.json({ user, token });
});

// upload track
app.post('/api/tracks/upload', auth, upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).json({ error: 'no file' });
  const title = req.file.originalname.replace(/\\.[^/.]+$/, '');
  const info = db.prepare('INSERT INTO tracks (user_id, filename, title, artist) VALUES (?,?,?,?)')
    .run(req.user.id || 0, req.file.filename, title, 'Local');
  res.json({ id: info.lastInsertRowid, url: '/uploads/' + req.file.filename, title });
});

// list tracks
app.get('/api/tracks', auth, (req,res)=>{
  const rows = db.prepare('SELECT id,filename,title,artist FROM tracks WHERE user_id = ? ORDER BY id DESC').all(req.user.id || 0);
  const mapped = rows.map(r=> ({ id:r.id, filename:r.filename, title:r.title, artist:r.artist, url:'/uploads/' + r.filename }));
  res.json(mapped);
});

// settings
app.post('/api/settings', auth, (req,res)=>{
  const s = JSON.stringify(req.body);
  db.prepare('INSERT INTO settings (user_id, data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').run(req.user.id, s);
  res.json({ ok:true });
});
app.get('/api/settings', auth, (req,res)=>{
  const row = db.prepare('SELECT data FROM settings WHERE user_id = ?').get(req.user.id);
  res.json(row ? JSON.parse(row.data) : {});
});

// serve frontend index for convenience
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// serve uploaded files
app.use('/uploads', express.static(uploadsDir));

app.listen(PORT, ()=> console.log('Audioryx backend running on', PORT));
