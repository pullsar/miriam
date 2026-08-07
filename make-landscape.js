const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public/images/gallery-3.jpeg');
const output = path.join(__dirname, 'public/images/gallery-3-landscape.jpeg');

sharp(input)
  .resize(1200, 800, { fit: 'cover', position: sharp.strategy.attention })
  .jpeg({ quality: 92, progressive: true })
  .toFile(output)
  .then(info => console.log('Created landscape:', info.width, 'x', info.height))
  .catch(err => { console.error(err); process.exit(1); });
