import JsBarcode from 'jsbarcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 30;

// A4 grid: 3 columns x 8 rows = 24 labels per sheet
const COLS = 3;
const ROWS = 8;

const COLORS = {
  text: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  border: rgb(0.85, 0.86, 0.9),
};

class BarcodeService {
  /**
   * Generates a printable A4 sheet of barcode labels.
   *
   * @param {object} opts
   * @param {object} opts.business   { name }
   * @param {Array}  opts.products   [{ name, sku, price, barcode }]
   * @param {number} [opts.copiesPerProduct]  default 1
   */
  async generateLabelSheet({ business = {}, products, copiesPerProduct = 1 }) {
    if (!products || products.length === 0) {
      throw new Error('No products to print labels for.');
    }

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // Expand products to individual labels
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

        // Label border (light)
        page.drawRectangle({
          x: x + 2,
          y: y + 2,
          width: labelW - 4,
          height: labelH - 4,
          borderColor: COLORS.border,
          borderWidth: 0.5,
        });

        // Business name (top)
        const biz = business.name || 'Your Business';
        const bizSize = 7;
        const bw = font.widthOfTextAtSize(biz, bizSize);
        page.drawText(biz, {
          x: x + (labelW - bw) / 2,
          y: y + labelH - 14,
          font,
          size: bizSize,
          color: COLORS.muted,
        });

        // Product name
        const name = this._truncate(product.name || '', 24);
        const nameSize = 9;
        const nw = fontBold.widthOfTextAtSize(name, nameSize);
        page.drawText(name, {
          x: x + (labelW - nw) / 2,
          y: y + labelH - 28,
          font: fontBold,
          size: nameSize,
          color: COLORS.text,
        });

        // Price
        const price = `KSh ${(Number(product.price) || 0).toLocaleString('en-KE')}`;
        const priceSize = 11;
        const pw = fontBold.widthOfTextAtSize(price, priceSize);
        page.drawText(price, {
          x: x + (labelW - pw) / 2,
          y: y + labelH - 45,
          font: fontBold,
          size: priceSize,
          color: COLORS.text,
        });

        // Barcode image (PNG data URL → PDF image)
        const barcodeValue = product.barcode || product.sku || '0000000000';
        // rendered synchronously via JsBarcode into a canvas, then embedded
        const dataUrl = this._renderBarcodeDataUrl(barcodeValue);
        if (dataUrl) {
          // eslint-disable-next-line no-undef
          const pngImage = doc.embedPng(dataUrl); // returns promise? actually sync via doc? we need await
        }
      });
    }

    // Since embedding images is async, we do a second pass
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = doc.getPage(pageIdx);
      const pageLabels = labels.slice(
        pageIdx * totalPerPage,
        (pageIdx + 1) * totalPerPage
      );

      for (let idx = 0; idx < pageLabels.length; idx++) {
        const product = pageLabels[idx];
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);

        const x = MARGIN + col * labelW;
        const y = PAGE_H - MARGIN - (row + 1) * labelH;

        const barcodeValue = product.barcode || product.sku || '0000000000';
        const dataUrl = this._renderBarcodeDataUrl(barcodeValue);
        if (!dataUrl) continue;

        try {
          const pngImage = await doc.embedPng(dataUrl);
          const barcodeW = labelW - 30;
          const barcodeH = 40;
          page.drawImage(pngImage, {
            x: x + (labelW - barcodeW) / 2,
            y: y + 18,
            width: barcodeW,
            height: barcodeH,
          });
        } catch {
          // fallback: print the code as text
          const t = this._truncate(barcodeValue, 18);
          const tw = font.widthOfTextAtSize(t, 8);
          page.drawText(t, {
            x: x + (labelW - tw) / 2,
            y: y + 36,
            font,
            size: 8,
            color: COLORS.muted,
          });
        }
      }
    }

    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  _truncate(text, max) {
    const s = String(text);
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
  }

  _renderBarcodeDataUrl(value) {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(value), {
        format: 'CODE128',
        displayValue: true,
        fontSize: 11,
        height: 40,
        margin: 2,
        width: 1.6,
        textMargin: 2,
        font: 'Helvetica',
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('barcode render failed:', err);
      return null;
    }
  }
}

export const barcodeService = new BarcodeService();