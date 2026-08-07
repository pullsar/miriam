const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'images');
const files = fs.readdirSync(dir).filter(f => /\.jpeg$/i.test(f));

(async () => {
  for (const f of files) {
    const p = path.join(dir, f);
    const tempPath = p + '.tmp';
    await sharp(p)
      .resize(1600, 2400, {
        fit: 'inside',
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3
      })
      .sharpen({ sigma: 1.2, m1: 0, m2: 2.5, x1: 2, y2: 10, y3: 20 })
      .modulate({ brightness: 1.03, saturation: 1.04 })
      .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toFile(tempPath);

    fs.renameSync(tempPath, p);
    console.log(`Enhanced ${f}`);
  }
})();
