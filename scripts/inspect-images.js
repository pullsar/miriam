const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'public', 'images');
const files = fs.readdirSync(dir).filter(f => /\.(jpeg|jpg|png)$/i.test(f));

(async () => {
  for (const f of files) {
    const p = path.join(dir, f);
    const meta = await sharp(p).metadata();
    console.log(`${f}: ${meta.width}x${meta.height}, ${Math.round(fs.statSync(p).size / 1024)}KB`);
  }
})();
