/*
 * EZCRM REST realtime sync server example.
 * ------------------------------------------------------------
 * GitHub Pages는 정적 호스팅이라 서버 저장이 불가능합니다.
 * 이 예제 서버는 다음을 제공합니다.
 *   GET  /api/ezcrm-sync  -> 최신 전체 JSON DB 읽기
 *   POST /api/ezcrm-sync  -> 최신 전체 JSON DB 저장 + 이벤트 로그 기록
 * 클라이언트는 GET을 주기적으로 호출해 모든 화면을 동일 DB로 맞춥니다.
 *
 * 실행:
 *   npm install
 *   EZCRM_ALLOWED_ORIGIN=https://YOUR_GITHUB_ID.github.io EZCRM_TOKEN=optional-token npm start
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

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

function checkAuth(req, res) {
  if (!TOKEN) return true;
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${TOKEN}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

function emptyDb() {
  return {
    customers: [], consults: [], asReqs: [], installs: [], materials: [], engineers: [], users: []
  };
}

function readLatestEnvelope() {
  if (!fs.existsSync(LATEST_FILE)) {
    return {
      ok: true,
      payload: emptyDb(),
      meta: { revision: '', updatedAtLocal: null, counts: {} }
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf8'));
    if (parsed && parsed.payload) return { ok: true, payload: parsed.payload, meta: parsed.meta || {} };
    return { ok: true, payload: parsed, meta: parsed.meta || {} };
  } catch (error) {
    return { ok: false, error: error.message, payload: emptyDb(), meta: {} };
  }
}

app.get('/api/ezcrm-sync', (req, res) => {
  if (!checkAuth(req, res)) return;
  const envelope = readLatestEnvelope();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json(envelope);
});

app.post('/api/ezcrm-sync', (req, res) => {
  if (!checkAuth(req, res)) return;

  const event = {
    receivedAt: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    body: req.body
  };
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf8');

  // full-db-save 이벤트는 최신 전체 DB 파일로 저장한다.
  if (req.body && req.body.kind === 'full-db-save' && req.body.data && req.body.data.payload) {
    const latest = {
      payload: req.body.data.payload,
      meta: req.body.data.meta || {
        revision: String(Date.now()),
        updatedAtLocal: new Date().toISOString()
      }
    };
    fs.writeFileSync(LATEST_FILE, JSON.stringify(latest, null, 2), 'utf8');
    return res.json({ ok: true, saved: true, receivedAt: event.receivedAt, meta: latest.meta });
  }

  res.json({ ok: true, saved: false, receivedAt: event.receivedAt });
});

app.get('/health', (_req, res) => res.json({ ok: true, app: 'EZCRM realtime sync server' }));

app.listen(PORT, () => {
  console.log(`EZCRM sync server listening on http://localhost:${PORT}`);
});
