const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data and uploads directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CANDLES_FILE = path.join(DATA_DIR, 'candles.json');

// Init data files if they don't exist
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');
if (!fs.existsSync(CANDLES_FILE)) fs.writeFileSync(CANDLES_FILE, JSON.stringify({ count: 0 }));

// Multer config — store photos in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

app.use(cors());
app.use(express.json());

// Serve the memorial frontend
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded photos
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Messages ───────────────────────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE));
  res.json(messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/messages', upload.single('photo'), (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });

  const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE));
  const entry = {
    id: uuidv4(),
    name: name.trim(),
    message: message.trim(),
    photo: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString()
  };
  messages.push(entry);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  res.status(201).json(entry);
});

// ── Gallery Photos ─────────────────────────────────────────────────────────
app.get('/api/photos', (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .map(f => ({
      filename: f,
      url: `/uploads/${f}`,
      uploadedAt: fs.statSync(path.join(UPLOADS_DIR, f)).mtime
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json(files);
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
  res.status(201).json({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// ── Candles ────────────────────────────────────────────────────────────────
app.get('/api/candles', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(CANDLES_FILE)));
});

app.post('/api/candles', (req, res) => {
  const data = JSON.parse(fs.readFileSync(CANDLES_FILE));
  data.count += 1;
  fs.writeFileSync(CANDLES_FILE, JSON.stringify(data));
  res.json(data);
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🕯️  Anthony's Memorial is live at http://localhost:${PORT}\n`);
});
