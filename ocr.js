// ocr.js
const Tesseract = require('tesseract.js');
const fs = require('fs');

const imagePath = process.argv[2];
const lang = process.argv[3] || 'deu+eng';

if (!imagePath) {
  console.error('Usage: node ocr.js <imagePath> [lang]');
  process.exit(1);
}

Tesseract.recognize(
  imagePath,
  lang,
  { logger: m => {} }
).then(({ data: { text } }) => {
  console.log(text);
  process.exit(0);
}).catch(err => {
  console.error('Tesseract.js error:', err);
  process.exit(1);
});
