/*
 * Optional EZCRM REST receiver example.
 * Run on your own VPS/cloud, not on GitHub Pages.
 *
 * npm install
 * EZCRM_ALLOWED_ORIGIN=https://YOUR_GITHUB_ID.github.io EZCRM_TOKEN=optional-token npm start
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.EZCRM_ALLOWED_ORIGIN || '*';
const TOKEN = process.env.EZCRM_TOKEN || '';
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'ezcrm-server-events.ndjson');
const LATEST_FILE = path.join(DATA_DIR, 'ezcrm-server-latest.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '25mb' }));

app.post('/api/ezcrm-sync', (req, res) => {
  if (TOKEN) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${TOKEN}`) return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const event = {
    receivedAt: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    body: req.body
  };

  fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf8');

  // full-db-save 이벤트는 최신 전체 DB 파일로도 저장한다.
  if (req.body && req.body.kind === 'full-db-save' && req.body.data && req.body.data.payload) {
    fs.writeFileSync(LATEST_FILE, JSON.stringify(req.body.data.payload, null, 2), 'utf8');
  }

  res.json({ ok: true, receivedAt: event.receivedAt });
});

app.get('/health', (_req, res) => res.json({ ok: true, app: 'EZCRM receiver' }));

app.listen(PORT, () => {
  console.log(`EZCRM receiver listening on http://localhost:${PORT}`);
});
