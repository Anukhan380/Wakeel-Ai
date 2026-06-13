const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const PORT = process.env.PORT || 3000;
const DATA = __dirname;

// ── Load API key ──────────────────────────────────────────────
function loadKey() {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10) return process.env.GROQ_API_KEY;
  try {
    const raw = fs.readFileSync(path.join(DATA, 'config.json'), 'utf8');
    const k = JSON.parse(raw).apiKey || '';
    if (k && k !== 'YOUR_GROQ_API_KEY_HERE' && k.length > 10) return k;
  } catch(e) {}
  return null;
}

function saveKey(k) {
  fs.writeFileSync(path.join(DATA, 'config.json'), JSON.stringify({ apiKey: k }, null, 2));
}

function askForKey(cb) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n========================================');
  console.log('  FREE KEY: https://console.groq.com');
  console.log('  Sign up > API Keys > Create Key');
  console.log('========================================\n');
  rl.question('Paste Groq key: ', k => {
    rl.close(); k = k.trim();
    if (k.length > 10) { saveKey(k); console.log('Key saved!\n'); cb(k); }
    else { console.log('Invalid key.'); process.exit(1); }
  });
}

// ── Admin password ────────────────────────────────────────────
// Reads from environment variable first (Railway), then admin.json
function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD.trim();
  try {
    const raw = fs.readFileSync(path.join(DATA, 'admin.json'), 'utf8');
    return (JSON.parse(raw).password || 'wakeel2024admin').trim();
  } catch(e) { return 'wakeel2024admin'; }
}

function getAdminSettings() {
  try {
    const raw = fs.readFileSync(path.join(DATA, 'admin.json'), 'utf8');
    return JSON.parse(raw);
  } catch(e) {
    return {
      password: getAdminPassword(),
      whatsapp: process.env.WHATSAPP || '03001234567',
      jazzcash: process.env.JAZZCASH || '03001234567'
    };
  }
}

// ── DB helpers ────────────────────────────────────────────────
function readDB(file) {
  try {
    const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
    return JSON.parse(raw);
  } catch(e) {
    if (file.includes('lawyers')) return [];
    if (file.includes('documents')) return [];
    return {};
  }
}

function writeDB(file, data) {
  try {
    fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2));
  } catch(e) {
    console.log('Warning: Could not write to', file, '-', e.message);
  }
}

// ── Groq API ──────────────────────────────────────────────────
function groqRequest(key, system, messages, cb) {
  const body = JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'system', content: system }].concat(messages),
    max_tokens: 1500,
    temperature: 0.3
  });
  const req = https.request({
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(body)
    }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const p = JSON.parse(d);
        if (p.error) { cb(null, p.error.message); return; }
        const t = p.choices?.[0]?.message?.content || '';
        cb(t || null, t ? null : 'Empty response');
      } catch(e) { cb(null, 'Parse error: ' + e.message); }
    });
  });
  req.on('error', e => cb(null, e.message));
  req.write(body);
  req.end();
}

// ── Parse body ────────────────────────────────────────────────
function parseBody(req, cb) {
  let b = '';
  req.on('data', c => b += c);
  req.on('end', () => {
    try { cb(null, JSON.parse(b)); }
    catch(e) { cb(e, null); }
  });
}

// ── Send JSON ─────────────────────────────────────────────────
function sendJSON(res, data, code) {
  res.writeHead(code || 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Serve HTML file ───────────────────────────────────────────
function serveFile(res, filename) {
  try {
    const content = fs.readFileSync(path.join(DATA, filename), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end('File not found: ' + filename);
  }
}

// ── Main server ───────────────────────────────────────────────
function startServer(apiKey) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = req.url.split('?')[0];

    // ── Static pages ─────────────────────────────────────────
    if (req.method === 'GET') {
      if (url === '/' || url === '/index.html') { serveFile(res, 'index.html'); return; }
      if (url === '/lawyer-portal') { serveFile(res, 'lawyer-portal.html'); return; }
      if (url === '/admin') { serveFile(res, 'admin.html'); return; }
      if (url === '/documents') { serveFile(res, 'documents.html'); return; }

      // Test page
      if (url === '/test') {
        groqRequest(apiKey, 'You are helpful.', [{ role:'user', content:'Say OK.' }], (t, e) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          if (e) res.end('<h2 style="color:red;font-family:sans-serif;padding:30px">❌ Error: ' + e + '</h2>');
          else res.end('<h2 style="color:green;font-family:sans-serif;padding:30px">✅ WakeelAI v2 Working!<br><br><a href="/">Open App</a> | <a href="/admin">Admin</a> | <a href="/lawyer-portal">Lawyer Portal</a></h2>');
        });
        return;
      }
    }

    // ── API: main chat ────────────────────────────────────────
    if (req.method === 'POST' && url === '/api/chat') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        groqRequest(apiKey, data.system, data.messages, (text, error) => {
          if (error) sendJSON(res, { error });
          else sendJSON(res, { content: [{ type: 'text', text }] });
        });
      });
      return;
    }

    // ── API: get lawyers ──────────────────────────────────────
    if (req.method === 'GET' && url === '/api/lawyers') {
      const lawyers = readDB('lawyers.json');
      const params = req.url.includes('?') ? new URLSearchParams(req.url.split('?')[1]) : null;
      const cat = params ? params.get('cat') : null;
      const active = lawyers.filter(l => l.active && (!cat || (l.specialty || []).includes(cat)));
      sendJSON(res, active.map(l => ({
        name: l.name, city: l.city, phone: l.phone,
        specialty: l.specialty, experience: l.experience, plan: l.plan
      })));
      return;
    }

    // ── API: lawyer login ─────────────────────────────────────
    if (req.method === 'POST' && url === '/api/lawyer-login') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { success: false, error: 'Bad request' }); return; }
        const lawyers = readDB('lawyers.json');
        const lawyer = lawyers.find(l => l.access_code === (data.code || '').trim() && l.active);
        if (lawyer) {
          sendJSON(res, { success: true, lawyer: { name: lawyer.name, city: lawyer.city, specialty: lawyer.specialty, plan: lawyer.plan, id: lawyer.id } });
        } else {
          sendJSON(res, { success: false, error: 'Invalid or inactive access code. Contact WakeelAI support.' });
        }
      });
      return;
    }

    // ── API: lawyer research ──────────────────────────────────
    if (req.method === 'POST' && url === '/api/lawyer-research') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        const lawyers = readDB('lawyers.json');
        const lawyer = lawyers.find(l => l.access_code === (data.code || '').trim() && l.active && l.plan === 'premium');
        if (!lawyer) { sendJSON(res, { error: 'Premium access required. Contact WakeelAI to upgrade your plan.' }); return; }
        const researchSystem = [
          'You are an expert Pakistani legal research assistant helping a practicing advocate prepare for court.',
          'When given a case, provide:',
          '1. CASE ANALYSIS — Key legal issues and applicable laws (cite Act names carefully)',
          '2. RELEVANT LAWS — All applicable Pakistani laws and ordinances',
          '3. LEGAL ARGUMENTS — Strong arguments the advocate can make in court',
          '4. COUNTER-ARGUMENTS — What opposing side may argue and how to counter',
          '5. PRACTICAL ADVICE — Procedural steps and evidence to gather',
          '6. SIMILAR CASE PATTERNS — Common outcomes in similar Pakistani cases',
          '',
          'Be precise and professional. Note: "Verify all citations independently before use in court."'
        ].join('\n');
        groqRequest(apiKey, researchSystem, [{ role: 'user', content: data.caseDetails }], (text, error) => {
          if (error) sendJSON(res, { error });
          else sendJSON(res, { content: [{ type: 'text', text }] });
        });
      });
      return;
    }

    // ── API: request document ─────────────────────────────────
    if (req.method === 'POST' && url === '/api/request-document') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        const docs = readDB('documents.json');
        const settings = getAdminSettings();
        const id = 'DOC' + Date.now();
        docs.push({
          id, type: data.type, description: data.description,
          name: data.name, phone: data.phone, email: data.email || '',
          price: data.price, status: 'pending',
          createdAt: new Date().toISOString(), document: null
        });
        writeDB('documents.json', docs);
        sendJSON(res, {
          success: true, id,
          message: 'Send Rs. ' + data.price + ' to JazzCash: ' + settings.jazzcash + ' with reference: ' + id + '. WhatsApp screenshot to: ' + settings.whatsapp
        });
      });
      return;
    }

    // ── API: generate document ────────────────────────────────
    if (req.method === 'POST' && url === '/api/generate-document') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        if ((data.password || '').trim() !== getAdminPassword().trim()) { sendJSON(res, { error: 'Wrong password' }); return; }
        const docs = readDB('documents.json');
        const doc = docs.find(d => d.id === data.id);
        if (!doc) { sendJSON(res, { error: 'Document not found' }); return; }
        const docSystem = [
          'You are an expert Pakistani legal document drafter.',
          'Write professional, legally sound documents in clear language.',
          'Use proper formal Pakistani legal format for applications and petitions.',
          'Always include: date, parties involved, subject matter, and proper closing.',
          'Write in the language requested (English or Urdu).',
          'IMPORTANT: Be precise. This document may be used in actual legal proceedings.'
        ].join('\n');
        const prompt = 'Draft a ' + doc.type + ' for:\n\n' + doc.description + '\n\nClient: ' + doc.name + '\n\nMake it complete, professional, and ready to use in Pakistan.';
        groqRequest(apiKey, docSystem, [{ role: 'user', content: prompt }], (text, error) => {
          if (error) { sendJSON(res, { error }); return; }
          doc.document = text;
          doc.status = 'completed';
          doc.completedAt = new Date().toISOString();
          writeDB('documents.json', docs);
          sendJSON(res, { success: true, document: text, id: doc.id });
        });
      });
      return;
    }

    // ── API: check document status ────────────────────────────
    if (req.method === 'POST' && url === '/api/check-document') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        const docs = readDB('documents.json');
        const doc = docs.find(d => d.id === (data.id || '').trim() && d.phone === (data.phone || '').trim());
        if (!doc) { sendJSON(res, { error: 'Not found. Check your document ID and phone number.' }); return; }
        if (doc.status === 'completed') sendJSON(res, { status: 'completed', document: doc.document, type: doc.type });
        else sendJSON(res, { status: doc.status, message: 'Your document is being prepared. You will be notified on WhatsApp.' });
      });
      return;
    }

    // ── API: admin data ───────────────────────────────────────
    if (req.method === 'POST' && url === '/api/admin-data') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        if ((data.password || '').trim() !== getAdminPassword()) {
          sendJSON(res, { error: 'Wrong password' }); return;
        }
        sendJSON(res, {
          lawyers: readDB('lawyers.json'),
          documents: readDB('documents.json'),
          admin: getAdminSettings()
        });
      });
      return;
    }

    // ── API: save lawyer ──────────────────────────────────────
    if (req.method === 'POST' && url === '/api/admin-save-lawyer') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        if ((data.password || '').trim() !== getAdminPassword()) { sendJSON(res, { error: 'Wrong password' }); return; }
        const lawyers = readDB('lawyers.json');
        const idx = lawyers.findIndex(l => l.id === data.lawyer.id);
        if (idx >= 0) lawyers[idx] = data.lawyer;
        else lawyers.push(data.lawyer);
        writeDB('lawyers.json', lawyers);
        sendJSON(res, { success: true });
      });
      return;
    }

    // ── API: delete lawyer ────────────────────────────────────
    if (req.method === 'POST' && url === '/api/admin-delete-lawyer') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        if ((data.password || '').trim() !== getAdminPassword()) { sendJSON(res, { error: 'Wrong password' }); return; }
        const lawyers = readDB('lawyers.json');
        writeDB('lawyers.json', lawyers.filter(l => l.id !== data.id));
        sendJSON(res, { success: true });
      });
      return;
    }

    // ── API: update document ──────────────────────────────────
    if (req.method === 'POST' && url === '/api/admin-update-doc') {
      parseBody(req, (err, data) => {
        if (err) { sendJSON(res, { error: 'Bad request' }); return; }
        if ((data.password || '').trim() !== getAdminPassword()) { sendJSON(res, { error: 'Wrong password' }); return; }
        const docs = readDB('documents.json');
        const doc = docs.find(d => d.id === data.id);
        if (doc) { doc.status = data.status; writeDB('documents.json', docs); }
        sendJSON(res, { success: true });
      });
      return;
    }


    // ── DEBUG: check what password Railway has ────────────────
    if (req.method === 'GET' && url === '/api/debug-password') {
      const pw = getAdminPassword();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2 style="font-family:sans-serif;padding:30px">Password length: ' + pw.length + '<br>First 3 chars: ' + pw.substring(0,3) + '<br>ADMIN_PASSWORD env set: ' + (!!process.env.ADMIN_PASSWORD) + '<br><br>Try logging in with exactly what is stored.</h2>');
      return;
    }

    res.writeHead(404); res.end('Not found');
  });

  server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('  WakeelAI v2 is running!');
    console.log('  Main:    http://localhost:' + PORT);
    console.log('  Admin:   http://localhost:' + PORT + '/admin');
    console.log('  Lawyers: http://localhost:' + PORT + '/lawyer-portal');
    console.log('  Docs:    http://localhost:' + PORT + '/documents');
    console.log('  Test:    http://localhost:' + PORT + '/test');
    console.log('========================================\n');
    console.log('Admin password:', getAdminPassword());
    groqRequest(apiKey, 'You are helpful.', [{ role:'user', content:'Say OK.' }], (t, e) => {
      if (e) console.log('Key test FAILED:', e);
      else console.log('AI working! Key is valid.\n');
    });
  });
}

// ── Entry point ───────────────────────────────────────────────
const k = loadKey();
if (k) { console.log('Key found. Starting...'); startServer(k); }
else if (process.env.RAILWAY_ENVIRONMENT) { console.log('ERROR: Set GROQ_API_KEY in Railway variables!'); process.exit(1); }
else askForKey(startServer);
