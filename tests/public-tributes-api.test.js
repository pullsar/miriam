const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('public tribute archive never exposes contributor contact details', async (t) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miriam-public-tributes-'));
  process.env.DB_PATH = path.join(temporaryRoot, 'tributes.db');

  const { app, db } = require('../server');
  db.prepare(`
    INSERT INTO tributes (name, email, phone, relationship, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'DR. TEST CONTRIBUTOR',
    'private@example.com',
    '+2348000000000',
    'Friend',
    'A deeply cherished friend.',
    '2026-08-22 10:00:00'
  );

  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/tributes`);
  assert.equal(response.status, 200);

  const [tribute] = await response.json();
  assert.deepEqual(Object.keys(tribute).sort(), [
    'created_at',
    'id',
    'message',
    'name',
    'relationship'
  ]);
  assert.equal(tribute.email, undefined);
  assert.equal(tribute.phone, undefined);
});
