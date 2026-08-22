require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

// ==================== DATABASE ====================
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, 'tributes.db');
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS tributes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    relationship TEXT,
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertTribute = db.prepare(
  `INSERT INTO tributes (name, email, phone, relationship, message)
   VALUES (@name, @email, @phone, @relationship, @message)`
);
const getAllTributes = db.prepare(`
  SELECT id, name, relationship, message, created_at
  FROM tributes
  ORDER BY created_at DESC, id DESC
`);
const getTributeCount = db.prepare(`SELECT COUNT(*) AS cnt FROM tributes`);

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tribute_id    INTEGER,
    uploader_name TEXT,
    uploader_email TEXT,
    relationship  TEXT,
    caption       TEXT,
    filename      TEXT NOT NULL,
    original_name TEXT,
    mimetype      TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertPhoto = db.prepare(
  `INSERT INTO photos (tribute_id, uploader_name, uploader_email, relationship, caption, filename, original_name, mimetype)
   VALUES (@tribute_id, @uploader_name, @uploader_email, @relationship, @caption, @filename, @original_name, @mimetype)`
);
const updatePhotoFilename = db.prepare(
  `UPDATE photos SET filename = @filename WHERE id = @id`
);
const getAllPhotos = db.prepare(`SELECT * FROM photos ORDER BY created_at DESC LIMIT 200`);

db.exec(`
  CREATE TABLE IF NOT EXISTS download_click_counts (
    resource TEXT PRIMARY KEY,
    count    INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
  )
`);

const incrementDownloadCount = db.prepare(`
  INSERT INTO download_click_counts (resource, count) VALUES (?, 1)
  ON CONFLICT(resource) DO UPDATE SET count = count + 1
`);
const getDownloadCounts = db.prepare(`SELECT resource, count FROM download_click_counts`);

const downloadsDir = process.env.DOWNLOADS_DIR || path.join(__dirname, 'public', 'downloads');
const trackedDownloads = [
  {
    resource: 'brochure',
    fileName: 'prof-miriam-ngozi-mgbakor-memorial-brochure.pdf'
  },
  {
    resource: 'order-of-mass',
    fileName: 'prof-miriam-ngozi-mgbakor-mobile-readings.pdf'
  }
];
const trackedDownloadsByResource = new Map(
  trackedDownloads.map(download => [download.resource, download])
);

trackedDownloads.forEach(({ resource, fileName }) => {
  const downloadPath = `/downloads/${fileName}`;

  app.head(downloadPath, (req, res) => {
    const filePath = path.join(downloadsDir, fileName);
    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404);
    }

    const { size } = fs.statSync(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${fileName}"`
    });
    res.status(200).end();
  });

  app.get(downloadPath, (req, res) => {
    const filePath = path.join(downloadsDir, fileName);
    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404);
    }

    res.download(filePath, fileName, err => {
      if (err) {
        console.error(`[downloads] Could not serve ${resource}:`, err.message);
        if (!res.headersSent) res.sendStatus(err.statusCode || 500);
      }
    });
  });
});

app.post('/api/download-counts/:resource', (req, res) => {
  const download = trackedDownloadsByResource.get(req.params.resource);
  if (!download || !fs.existsSync(path.join(downloadsDir, download.fileName))) {
    return res.sendStatus(404);
  }

  try {
    incrementDownloadCount.run(download.resource);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Could not record the download.' });
  }
});

app.get('/api/download-counts', (req, res) => {
  try {
    const totals = Object.fromEntries(
      getDownloadCounts.all().map(row => [row.resource, row.count])
    );
    res.json({
      brochure: totals.brochure || 0,
      orderOfMass: totals['order-of-mass'] || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve download totals.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// ==================== UPLOADS ====================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const uploadsBase = path.join(__dirname, 'public', 'uploads');
const tributeUploadDir = path.join(uploadsBase, 'tributes');
const photoUploadDir = path.join(uploadsBase, 'photos');
ensureDir(tributeUploadDir);
ensureDir(photoUploadDir);

function makeUploadStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    }
  });
}

function makeUpload(destDir, maxCount, maxSize = 5 * 1024 * 1024) {
  return multer({
    storage: makeUploadStorage(destDir),
    limits: { fileSize: maxSize, files: maxCount },
    fileFilter: (req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed.'));
      }
    }
  });
}

const tributeUpload = makeUpload(tributeUploadDir, 3, 5 * 1024 * 1024);
const photoUpload = makeUpload(photoUploadDir, 5, 5 * 1024 * 1024);

// ==================== MAIL ====================
const TRIBUTE_TO = process.env.TRIBUTE_TO || 'chibukocelia@gmail.com';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Miriam Ngo Memorial';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'tributes@example.com';

let transporter = null;
if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: { rejectUnauthorized: false }
  });
} else {
  console.warn('[mail] SMTP not configured. Tribute emails will not be sent.');
}

function buildPhotoListHtml(files) {
  if (!files || files.length === 0) return '';
  const items = files.map(f => `<li style="margin:0 0 8px;"><a href="${f.url}" style="color:#1e3a5f;">${f.original_name}</a></li>`).join('');
  return `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:20px 0 8px;"><strong>Uploaded photos:</strong></p><ul style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 20px;padding-left:20px;">${items}</ul>`;
}

function buildTributeEmail({ name, email, phone, relationship, message, files = [] }) {
  const photoLinks = files.map(f => `${SITE_URL}${f.url}`).join('\n');
  const plainText = [
    `New tribute received for Miriam Ngo`,
    ``,
    `From: ${name}`,
    relationship ? `Relationship: ${relationship}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    ``,
    `Tribute:`,
    message,
    files.length ? `\nPhotos:\n${photoLinks}` : null
  ].filter(Boolean).join('\n');

  const attachments = files.map(f => ({ filename: f.original_name, path: f.path }));

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Tribute — Miriam Ngo</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f6f1;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f6f1;padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-collapse:collapse;">
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="background-color:#1e3a5f;padding:40px 30px;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#87ceeb;margin:0 0 12px;">In Christ, In Glory</p>
            <h1 style="font-family:Georgia,serif;font-size:30px;color:#ffffff;margin:0;font-weight:normal;">New Tribute Received</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 30px;">
            <p style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.7;margin:0 0 20px;"><strong>${name}</strong> sent a tribute.</p>
            ${relationship ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Relationship:</strong> ${relationship}</p>` : ''}
            ${email ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#1e3a5f;">${email}</a></p>` : ''}
            ${phone ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 20px;"><strong>Phone:</strong> ${phone}</p>` : ''}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;border-left:4px solid #c9a227;padding:20px 24px;">
              <tr><td>
                <p style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.8;margin:0;font-style:italic;white-space:pre-wrap;">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
              </td></tr>
            </table>
            ${buildPhotoListHtml(files)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px 30px;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#8a8a8a;margin:0;">Received from miriamngo.com</p>
          </td>
        </tr>
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { plainText, html, attachments };
}

async function sendTributeEmail(data, files = []) {
  if (!transporter) {
    console.warn('[mail] No transporter configured; skipping email.');
    return false;
  }

  const { plainText, html, attachments } = buildTributeEmail({ ...data, files });
  const replyTo = data.email ? [data.email] : undefined;

  try {
    await transporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
      to: TRIBUTE_TO,
      replyTo,
      subject: `New tribute from ${data.name} — Miriam Ngo Memorial`,
      text: plainText,
      html,
      attachments
    });
    console.log(`[mail] Tribute notification sent for ${data.name}`);
    return true;
  } catch (err) {
    console.error('[mail] Failed to send tribute notification:', err.message);
    return false;
  }
}

function buildTributeCopyEmail({ name, relationship, message, files = [] }) {
  const photoLinks = files.map(f => `${SITE_URL}${f.url}`).join('\n');
  const plainText = [
    `Thank you for your tribute, ${name}.`,
    ``,
    `Here is a copy of what you submitted:`,
    relationship ? `Relationship: ${relationship}` : null,
    ``,
    message,
    files.length ? `\nPhotos:\n${photoLinks}` : null
  ].filter(Boolean).join('\n');

  const attachments = files.map(f => ({ filename: f.original_name, path: f.path }));

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thank You for Your Tribute — Miriam Ngo</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f6f1;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f6f1;padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-collapse:collapse;">
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="background-color:#1e3a5f;padding:40px 30px;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#87ceeb;margin:0 0 12px;">In Christ, In Glory</p>
            <h1 style="font-family:Georgia,serif;font-size:30px;color:#ffffff;margin:0;font-weight:normal;">Thank You for Your Tribute</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 30px;">
            <p style="font-family:Georgia,serif;font-size:16px;color:#1a1a1a;line-height:1.7;margin:0 0 20px;">Dear <strong>${name}</strong>,</p>
            <p style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 20px;">Here is a copy of the tribute and photos you shared in memory of our beloved mother. We are deeply grateful.</p>
            ${relationship ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Relationship:</strong> ${relationship}</p>` : ''}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;border-left:4px solid #c9a227;padding:20px 24px;">
              <tr><td>
                <p style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;line-height:1.8;margin:0;font-style:italic;white-space:pre-wrap;">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
              </td></tr>
            </table>
            ${buildPhotoListHtml(files)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px 30px;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#8a8a8a;margin:0;">Received from miriamngo.com</p>
          </td>
        </tr>
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { plainText, html, attachments };
}

async function sendTributeCopyToAuthor(data, files = []) {
  if (!transporter || !data.email) return false;

  const { plainText, html, attachments } = buildTributeCopyEmail({ ...data, files });

  try {
    await transporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
      to: data.email,
      subject: 'Thank you for your tribute — Miriam Ngo Memorial',
      text: plainText,
      html,
      attachments
    });
    console.log(`[mail] Tribute copy sent to ${data.email}`);
    return true;
  } catch (err) {
    console.error('[mail] Failed to send tribute copy to author:', err.message);
    return false;
  }
}

function buildPhotoUploadEmail({ name, email, phone, relationship, caption, files = [] }) {
  const photoLinks = files.map(f => `${SITE_URL}${f.url}`).join('\n');
  const plainText = [
    `New photos uploaded for Miriam Ngo`,
    ``,
    name ? `From: ${name}` : null,
    relationship ? `Relationship: ${relationship}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    caption ? `Caption: ${caption}` : null,
    files.length ? `\nPhotos:\n${photoLinks}` : null
  ].filter(Boolean).join('\n');

  const attachments = files.map(f => ({ filename: f.original_name, path: f.path }));

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Photos — Miriam Ngo</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f6f1;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f6f1;padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-collapse:collapse;">
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="background-color:#1e3a5f;padding:40px 30px;text-align:center;">
            <h1 style="font-family:Georgia,serif;font-size:30px;color:#ffffff;margin:0;font-weight:normal;">New Photos Shared</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 30px;">
            ${name ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>From:</strong> ${name}</p>` : ''}
            ${relationship ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Relationship:</strong> ${relationship}</p>` : ''}
            ${email ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#1e3a5f;">${email}</a></p>` : ''}
            ${phone ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 6px;"><strong>Phone:</strong> ${phone}</p>` : ''}
            ${caption ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5a5a5a;margin:0 0 20px;"><strong>Caption:</strong> ${caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
            ${buildPhotoListHtml(files)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 30px 30px;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#8a8a8a;margin:0;">Received from miriamngo.com</p>
          </td>
        </tr>
        <tr><td style="height:4px;background:#1e3a5f;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { plainText, html, attachments };
}

async function sendPhotoUploadEmail(data, files = []) {
  if (!transporter) {
    console.warn('[mail] No transporter configured; skipping email.');
    return false;
  }

  const fromName = data.name || 'Someone';
  const { plainText, html, attachments } = buildPhotoUploadEmail({ ...data, files });
  const replyTo = data.email ? [data.email] : undefined;

  try {
    await transporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
      to: TRIBUTE_TO,
      replyTo,
      subject: `New photos from ${fromName} — Miriam Ngo Memorial`,
      text: plainText,
      html,
      attachments
    });
    console.log(`[mail] Photo upload notification sent for ${fromName}`);
    return true;
  } catch (err) {
    console.error('[mail] Failed to send photo upload notification:', err.message);
    return false;
  }
}

// ==================== QR CODE ====================
const qrPath = path.join(__dirname, 'public', 'qrcode.png');

async function generateQr() {
  try {
    await QRCode.toFile(qrPath, SITE_URL, {
      width: 400,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' }
    });
    console.log(`[qr] generated for ${SITE_URL}`);
  } catch (err) {
    console.error('[qr] error:', err.message);
  }
}

// ==================== ROUTES ====================
function fileInfo(file, subdir) {
  return {
    url: `/uploads/${subdir}/${path.basename(file.path)}`,
    path: file.path,
    original_name: file.originalname,
    filename: file.filename
  };
}

// Server-side image compression (defence-in-depth if the browser didn't
// compress, or for legacy clients). Re-encodes the saved file in place as
// a JPEG no larger than 1600px on the longest edge, target ~450 KB.
const SERVER_MAX_DIM = 1600;
const SERVER_TARGET_BYTES = 450 * 1024;

async function compressSavedImage(filePath) {
  try {
    const buf = await sharp(filePath)
      .rotate() // honour EXIF orientation
      .resize({ width: SERVER_MAX_DIM, height: SERVER_MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    // Only overwrite if we actually made it smaller.
    const original = fs.statSync(filePath).size;
    if (buf.length < original) {
      const newPath = filePath.replace(/\.(png|webp|heic|heif|avif|gif)$/i, '.jpg');
      fs.writeFileSync(newPath, buf);
      if (newPath !== filePath) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
      console.log(`[sharp] ${path.basename(newPath)}: ${(original/1024).toFixed(0)}KB -> ${(buf.length/1024).toFixed(0)}KB`);
      return newPath;
    }
    return filePath;
  } catch (err) {
    console.warn(`[sharp] skipped ${path.basename(filePath)}:`, err.message);
    return filePath;
  }
}

async function compressUploadedFiles(fileInfos) {
  const results = await Promise.allSettled(
    fileInfos.map(async (info) => {
      info.originalFilename = info.filename;
      const newPath = await compressSavedImage(info.path);
      if (newPath !== info.path) {
        info.path = newPath;
        info.filename = path.basename(newPath);
        info.url = info.url.replace(path.basename(info.url), info.filename);
      }
      return info;
    })
  );
  return results.map(r => r.value || r.reason);
}

app.post('/api/tribute', tributeUpload.array('photos', 3), async (req, res) => {
  const { name, email, phone, relationship, message } = req.body;
  const files = req.files || [];

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and tribute message are required.' });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  let tributeId;
  try {
    const info = insertTribute.run({ name, email, phone, relationship, message });
    tributeId = info.lastInsertRowid;
  } catch (err) {
    console.error('[tribute] db error:', err.message);
    return res.status(500).json({ error: 'Could not save tribute. Please try again.' });
  }

  const fileInfos = files.map(f => fileInfo(f, 'tributes'));
  try {
    fileInfos.forEach(f => {
      const info = insertPhoto.run({
        tribute_id: tributeId,
        uploader_name: name,
        uploader_email: email,
        relationship,
        caption: null,
        filename: f.filename,
        original_name: f.original_name,
        mimetype: f.mimetype
      });
      f.photoId = info.lastInsertRowid;
    });
  } catch (err) {
    console.error('[tribute] photo db error:', err.message);
  }

  res.json({ success: true, message: 'Thank you. Your tribute has been received.' });

  // Compress saved files in the background, update DB filenames if renamed,
  // then send emails with the (possibly renamed) attachments.
  compressUploadedFiles(fileInfos)
    .then(() => {
      fileInfos.forEach(f => {
        if (f.photoId && f.originalFilename !== f.filename) {
          try { updatePhotoFilename.run({ id: f.photoId, filename: f.filename }); } catch (_) {}
        }
      });
      return sendTributeEmail({ name, email, phone, relationship, message }, fileInfos);
    })
    .catch(err => console.error('[tribute] compress/email error:', err.message));

  if (email) {
    sendTributeCopyToAuthor({ name, email, phone, relationship, message }, fileInfos).catch(err => {
      console.error('[tribute] author copy error:', err.message);
    });
  }
});

app.post('/api/upload-photos', photoUpload.array('photos', 5), async (req, res) => {
  const { name, email, phone, relationship, caption } = req.body;
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: 'Please select at least one photo to upload.' });
  }

  const fileInfos = files.map(f => fileInfo(f, 'photos'));
  try {
    fileInfos.forEach(f => {
      const info = insertPhoto.run({
        tribute_id: null,
        uploader_name: name || null,
        uploader_email: email || null,
        relationship: relationship || null,
        caption: caption || null,
        filename: f.filename,
        original_name: f.original_name,
        mimetype: f.mimetype
      });
      f.photoId = info.lastInsertRowid;
    });
  } catch (err) {
    console.error('[upload-photos] db error:', err.message);
    return res.status(500).json({ error: 'Could not save photos. Please try again.' });
  }

  res.json({ success: true, message: 'Thank you. Your photos have been received.' });

  compressUploadedFiles(fileInfos)
    .then(() => {
      fileInfos.forEach(f => {
        if (f.photoId && f.originalFilename !== f.filename) {
          try { updatePhotoFilename.run({ id: f.photoId, filename: f.filename }); } catch (_) {}
        }
      });
      return sendPhotoUploadEmail({ name, email, phone, relationship, caption }, fileInfos);
    })
    .catch(err => console.error('[upload-photos] compress/email error:', err.message));
});

app.get('/api/photos', (req, res) => {
  try {
    const photos = getAllPhotos.all().map(p => ({
      id: p.id,
      url: `/uploads/${p.tribute_id ? 'tributes' : 'photos'}/${p.filename}`,
      caption: p.caption,
      uploader_name: p.uploader_name,
      relationship: p.relationship,
      created_at: p.created_at
    }));
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve photos.' });
  }
});

app.get('/api/tributes', (req, res) => {
  try {
    res.json(getAllTributes.all());
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve tributes.' });
  }
});

app.get('/api/tribute-count', (req, res) => {
  try {
    const { cnt } = getTributeCount.get();
    res.json({ count: cnt });
  } catch (err) {
    res.status(500).json({ error: 'Could not count tributes.' });
  }
});

app.get('/api/qr', async (req, res) => {
  try {
    const dataUrl = await QRCode.toDataURL(SITE_URL, {
      width: 400,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' }
    });
    res.json({ url: SITE_URL, qrDataUrl: dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate QR code.' });
  }
});

app.get('/api/config', (req, res) => {
  res.json({ siteUrl: SITE_URL });
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'One or more photos are too large. Max size per file is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many photos selected.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Could not process upload.' });
  }
  next();
}

app.use(handleMulterError);

function startServer(port = PORT) {
  return new Promise(async (resolve) => {
    await generateQr();
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort = (addr && addr.port) || port;
      console.log(`Memorial site running on http://localhost:${actualPort}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, db, startServer };
