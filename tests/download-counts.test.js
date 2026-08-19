const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BROCHURE_FILE = 'prof-miriam-ngozi-mgbakor-memorial-brochure.pdf';
const READINGS_FILE = 'prof-miriam-ngozi-mgbakor-mobile-readings.pdf';
const BROCHURE_PATH = `/downloads/${BROCHURE_FILE}`;
const READINGS_PATH = `/downloads/${READINGS_FILE}`;

test('tracked memorial PDFs expose independent successful-download totals', async (t) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'miriam-download-counts-'));
  const downloadsDir = path.join(temporaryRoot, 'downloads');
  fs.mkdirSync(downloadsDir);
  fs.writeFileSync(path.join(downloadsDir, BROCHURE_FILE), Buffer.from('%PDF-1.4\n%%EOF'));
  fs.writeFileSync(path.join(downloadsDir, READINGS_FILE), Buffer.from('%PDF-1.4\n%%EOF'));

  process.env.DB_PATH = path.join(temporaryRoot, 'counts.db');
  process.env.DOWNLOADS_DIR = downloadsDir;

  const { app, db } = require('../server');
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (db) db.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const counts = async () => {
    const response = await fetch(`${baseUrl}/api/download-counts`);
    assert.equal(response.status, 200);
    return response.json();
  };

  assert.deepEqual(await counts(), { brochure: 0, orderOfMass: 0 });

  const brochureMetadata = await fetch(`${baseUrl}${BROCHURE_PATH}`, { method: 'HEAD' });
  assert.equal(brochureMetadata.status, 200);
  assert.match(brochureMetadata.headers.get('content-type') || '', /application\/pdf/);
  assert.deepEqual(await counts(), { brochure: 0, orderOfMass: 0 });

  const brochure = await fetch(`${baseUrl}${BROCHURE_PATH}`);
  assert.equal(brochure.status, 200);
  assert.equal(await brochure.text(), '%PDF-1.4\n%%EOF');
  assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 0 });

  const readings = await fetch(`${baseUrl}${READINGS_PATH}`);
  assert.equal(readings.status, 200);
  assert.equal(await readings.text(), '%PDF-1.4\n%%EOF');
  assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 1 });

  fs.unlinkSync(path.join(downloadsDir, READINGS_FILE));
  assert.equal((await fetch(`${baseUrl}${READINGS_PATH}`)).status, 404);
  assert.deepEqual(await counts(), { brochure: 1, orderOfMass: 1 });
});
