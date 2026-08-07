process.env.DB_PATH = require('path').join(__dirname, 'data', 'test-tributes.db');

const { startServer } = require('./server');
const http = require('http');
const fs = require('fs');
const path = require('path');

function request(port, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port, ...options }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) {
      req.setHeader('Content-Type', 'application/json');
      const payload = JSON.stringify(body);
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  const server = await startServer(0);
  const port = server.address().port;
  let failed = false;

  try {
    const home = await request(port, { path: '/', method: 'GET' });
    if (home.status !== 200 || !home.body.includes('In Christ')) {
      console.error('✗ Home page failed', home.status);
      failed = true;
    } else {
      console.log('✓ Home page');
    }

    const config = await request(port, { path: '/api/config', method: 'GET' });
    const cfg = JSON.parse(config.body);
    console.log('✓ Config:', cfg.siteUrl);

    const qr = await request(port, { path: '/api/qr', method: 'GET' });
    const qrObj = JSON.parse(qr.body);
    if (!qrObj.qrDataUrl) throw new Error('Missing QR data URL');
    console.log('✓ QR endpoint');

    const png = await request(port, { path: '/qrcode.png', method: 'GET' });
    if (png.status !== 200 || png.headers['content-type'] !== 'image/png') {
      console.error('✗ QR image failed');
      failed = true;
    } else {
      console.log('✓ QR image file');
    }

    const tribute = await request(port, { path: '/api/tribute', method: 'POST' }, { name: 'Test', message: 'Rest in the Lord.' });
    if (tribute.status !== 200) {
      console.error('✗ Tribute post failed', tribute.status, tribute.body);
      failed = true;
    } else {
      console.log('✓ Tribute posted');
    }

    const list = await request(port, { path: '/api/tributes', method: 'GET' });
    const arr = JSON.parse(list.body);
    if (!Array.isArray(arr) || arr.length === 0) {
      console.error('✗ Tributes list failed');
      failed = true;
    } else {
      console.log('✓ Tributes list:', arr.length);
    }
  } catch (err) {
    console.error('Test error:', err.message);
    failed = true;
  } finally {
    server.close(() => {
      try { fs.unlinkSync(process.env.DB_PATH); } catch {}
      process.exit(failed ? 1 : 0);
    });
  }
}

run();
