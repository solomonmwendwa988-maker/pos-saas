import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 30;
const COLS = 3;
const ROWS = 8;

const COLORS = {
  text: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  border: rgb(0.85, 0.86, 0.9),
  bar: rgb(0.06, 0.09, 0.16),
};

/**
 * CODE128 barcode encoder — pure JavaScript, no dependencies.
 * Patterns from the standard CODE128 spec.
 */
const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000',
  '10010001100', '10001001100', '10011001000', '10011000100',
  '10001100100', '11001001000', '11001000100', '11000100100',
  '10110011100', '10011011100', '10011001110', '10111001100',
  '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110',
  '11101001100', '11100101100', '11100100110', '11101100100',
  '11100110100', '11100110010', '11011011000', '11011000110',
  '11000110110', '10100011000', '10001011000', '10001000110',
  '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110',
  '10001101110', '10111011000', '10111000110', '10001110110',
  '11101110110', '11010001110', '11000101110', '11011101000',
  '11011100010', '11011101110', '11101011000', '11101000110',
  '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000',
  '10100001100', '10010110000', '10010000110', '10000101100',
  '10000100110', '10110010000', '10110000100', '10011010000',
  '10011000010', '10000110100', '10000110010', '11000010010',
  '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100',
  '10011110100', '10011110010', '11110100100', '11110010100',
  '11110010010', '11011011110', '11011110110', '11110110110',
  '10101111000', '10100011110', '10001011110', '10111101000',
  '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100',
  '11010010000', '11010011100', '1100011101011',
];

function code128Encode(value) {
  const text = String(value);
  const codes = [104]; // Start B
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 94) continue;
    codes.push(code);
  }
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    sum += codes[i] * i;
  }
  codes.push(sum % 103);
  codes.push(106); // Stop
  return codes.map(c => CODE128_PATTERNS[c] || '').join('');
}

class BarcodeService {
  async generateLabelSheet({ business = {}, products, copiesPerProduct = 1 }) {
    if (!products || products.length === 0) {
      throw new Error('No products to print labels for.');
    }

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const labels = [];
    products.forEach(p => {
      for (let i = 0; i < copiesPerProduct; i++) {
        labels.push(p);
      }
    });

    const totalPerPage = COLS * ROWS;
    const totalPages = Math.ceil(labels.length / totalPerPage);
    const labelW = (PAGE_W - MARGIN * 2) / COLS;
    const labelH = (PAGE_H - MARGIN * 2) / ROWS;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = doc.addPage([PAGE_W, PAGE_H]);
      const pageLabels = labels.slice(
        pageIdx * totalPerPage,
        (pageIdx + 1) * totalPerPage
      );

      pageLabels.forEach((product, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);

        const x = MARGIN + col * labelW;
        const y = PAGE_H - MARGIN - (row + 1) * labelH;

        // Label border
        page.drawRectangle({
          x: x + 2,
          y: y + 2,
          width: labelW - 4,
          height: labelH - 4,
          borderColor: COLORS.border,
          borderWidth: 0.5,
        });

        // Business name
        const biz = this._truncate(business.name || 'Your Business', 30);
        const bizSize = 6.5;
        const bw = font.widthOfTextAtSize(biz, bizSize);
        page.drawText(biz, {
          x: x + (labelW - bw) / 2,
          y: y + labelH - 12,
          font,
          size: bizSize,
          color: COLORS.muted,
        });

        // Product name
        const name = this._truncate(product.name || '', 22);
        const nameSize = 8.5;
        const nw = fontBold.widthOfTextAtSize(name, nameSize);
        page.drawText(name, {
          x: x + (labelW - nw) / 2,
          y: y + labelH - 25,
          font: fontBold,
          size: nameSize,
          color: COLORS.text,
        });

        // Price
        const price = `KSh ${(Number(product.price) || 0).toLocaleString('en-KE')}`;
        const priceSize = 10;
        const pw = fontBold.widthOfTextAtSize(price, priceSize);
        page.drawText(price, {
          x: x + (labelW - pw) / 2,
          y: y + labelH - 41,
          font: fontBold,
          size: priceSize,
          color: COLORS.text,
        });

        // Barcode
        const barcodeValue = String(product.barcode || product.sku || '0000000');
        this._drawBarcode(page, barcodeValue, {
          x: x + 10,
          y: y + 14,
          width: labelW - 20,
          height: 34,
          font,
        });
      });
    }

    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  _drawBarcode(page, value, { x, y, width, height, font }) {
    let pattern;
    try {
      pattern = code128Encode(value);
    } catch {
      pattern = '';
    }
    if (!pattern) {
      page.drawText(this._truncate(value, 20), {
        x,
        y: y + height / 2,
        font,
        size: 8,
        color: COLORS.muted,
      });
      return;
    }

    const bars = pattern.length;
    const barW = width / bars;
    let cx = x;
    for (let i = 0; i < bars; i++) {
      if (pattern[i] === '1') {
        page.drawRectangle({
          x: cx,
          y,
          width: Math.max(0.4, barW),
          height,
          color: COLORS.bar,
        });
      }
      cx += barW;
    }

    const label = this._truncate(value, 24);
    const size = 7;
    const lw = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: x + (width - lw) / 2,
      y: y - 8,
      font,
      size,
      color: COLORS.text,
    });
  }

  _truncate(text, max) {
    const s = String(text);
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
  }
}

export const barcodeService = new BarcodeService();