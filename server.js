const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const PORT = process.env.PORT || 3000;

// Load key from environment variable (Railway) or config.json (local PC)
function loadKey() {
  // Railway / cloud environment variable
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10) {
    console.log('Key loaded from environment variable.');
    return process.env.GROQ_API_KEY;
  }
  // Local config.json
  try {
    const configPath = path.join(__dirname, 'config.json');
    const raw = fs.readFileSync(configPath, 'utf8').trim();
    const key = JSON.parse(raw).apiKey || '';
    if (key && key !== 'YOUR_GROQ_API_KEY_HERE' && key.length > 10) {
      console.log('Key loaded from config.json.');
      return key;
    }
  } catch(e) {}
  return null;
}

function saveKey(key) {
  fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({ apiKey: key }, null, 2));
}

function askForKey(callback) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n========================================');
  console.log('  GET FREE KEY: https://console.groq.com');
  console.log('  Sign up → API Keys → Create API Key');
  console.log('  Key starts with: gsk_');
  console.log('========================================\n');
  rl.question('Paste your Groq key and press Enter: ', (key) => {
    rl.close();
    key = key.trim();
    if (key && key.length > 10) {
      saveKey(key);
      console.log('\n✅ Key saved!\n');
      callback(key);
    } else {
      console.log('Invalid key. Run start.bat again.');
      process.exit(1);
    }
  });
}

function groqRequest(key, systemPrompt, messages, callback) {
  const bodyObj = {
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'system', content: systemPrompt }].concat(messages),
    max_tokens: 1500,
    temperature: 0.3
  };
  const bodyStr = JSON.stringify(bodyObj);
  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'Content-Length': Buffer.byteLength(bodyStr)
    }
  };
  const req = https.request(options, (resp) => {
    let data = '';
    resp.on('data', c => data += c);
    resp.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) { callback(null, parsed.error.message); return; }
        const text = parsed.choices?.[0]?.message?.content || '';
        callback(text || null, text ? null : 'Empty response');
      } catch(e) { callback(null, 'Parse error: ' + e.message); }
    });
  });
  req.on('error', e => callback(null, 'Network error: ' + e.message));
  req.write(bodyStr);
  req.end();
}

function startServer(apiKey) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Serve HTML
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      try {
        const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch(e) { res.writeHead(500); res.end('index.html missing'); }
      return;
    }

    // Test page
    if (req.method === 'GET' && req.url === '/test') {
      groqRequest(apiKey, 'You are helpful.', [{ role:'user', content:'Say OK.' }], (text, err) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (err) {
          res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#fff0f0">
            <h2 style="color:red">❌ Error: ${err}</h2>
            <p>Check your API key.</p>
          </body></html>`);
        } else {
          res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#e8f5ee">
            <h2 style="color:#1a5c3a">✅ Working! AI said: ${text}</h2>
            <h3><a href="/" style="color:#1a5c3a">👉 Open WakeelAI</a></h3>
          </body></html>`);
        }
      });
      return;
    }

    // Payment success page
    if (req.method === 'GET' && req.url === '/success') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#e8f5ee">
        <h1 style="color:#1a5c3a">✅ Payment Received!</h1>
        <p style="font-size:18px">Thank you for subscribing to WakeelAI.</p>
        <p>Your account is now active. <a href="/">Go to WakeelAI</a></p>
      </body></html>`);
      return;
    }

    // Chat API
    if (req.method === 'POST' && req.url === '/api/chat') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          groqRequest(apiKey, parsed.system, parsed.messages, (text, err) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            if (err) res.end(JSON.stringify({ error: err }));
            else res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
          });
        } catch(e) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404); res.end('Not found');
  });

  server.listen(PORT, () => {
    console.log('\n✅ WakeelAI running on port ' + PORT);
    if (PORT == 3000) {
      console.log('🌐 http://localhost:3000');
      console.log('🧪 http://localhost:3000/test\n');
    }
  });
}

// Entry point
const existingKey = loadKey();
if (existingKey) {
  startServer(existingKey);
} else {
  // On Railway without key set, crash with helpful message
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('ERROR: Set GROQ_API_KEY in Railway environment variables!');
    process.exit(1);
  }
  askForKey(startServer);
}
