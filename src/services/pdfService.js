import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 40;
const HEADER_H = 110;
const FOOTER_H = 40;
const ROW_H = 22;
const HEADER_ROW_H = 26;

const COLORS = {
  text: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  faint: rgb(0.58, 0.64, 0.72),
  border: rgb(0.9, 0.91, 0.94),
  altRow: rgb(0.97, 0.98, 1),
  primary: rgb(0.43, 0.37, 0.99),
  primaryLight: rgb(0.95, 0.94, 1),
  success: rgb(0.09, 0.64, 0.29),
  danger: rgb(0.86, 0.15, 0.15),
  white: rgb(1, 1, 1),
};

function truncate(text, maxChars) {
  const s = String(text ?? '');
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(1, maxChars - 1)) + '…';
}

function moneyFmt(n) {
  const v = Number(n) || 0;
  return `KSh ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

class PdfService {
  /**
   * Generates a professional table PDF.
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} [opts.subtitle]
   * @param {object} [opts.business]  { name, location, phone, email }
   * @param {string} [opts.filename]
   * @param {Array}  opts.columns     [{ key, label, width, align, format }]
   * @param {Array}  opts.rows
   * @param {object} [opts.totals]    { label: value } rendered below the table
   * @param {number} [opts.maxRows]   caps at this many rows (default 500)
   */
  async generateTablePdf({
    title,
    subtitle,
    business = {},
    columns,
    rows,
    totals,
    filename,
    maxRows = 500,
    footerNote,
  }) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const totalRows = rows.length;
    const cappedRows = rows.slice(0, maxRows);
    const truncated = totalRows > maxRows;

    // Column widths: use explicit widths, or distribute evenly
    const tableWidth = PAGE_W - MARGIN * 2;
    const totalColWidth =
      columns.reduce((s, c) => s + (c.width || 0), 0) || 1;
    const widths = columns.map(c =>
      c.width
        ? (c.width / totalColWidth) * tableWidth
        : tableWidth / columns.length
    );

    // Compute how many rows fit per page
    const usableHeight = PAGE_H - HEADER_H - FOOTER_H - 20;
    const rowsPerPage = Math.max(
      5,
      Math.floor((usableHeight - HEADER_ROW_H) / ROW_H)
    );
    const totalPages = Math.max(
      1,
      Math.ceil(cappedRows.length / rowsPerPage)
    );

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = doc.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H;

      // ---------- Header ----------
      this._drawHeader(page, font, fontBold, {
        title,
        subtitle,
        business,
        pageNumber: pageIdx + 1,
        totalPages,
      });

      y = PAGE_H - HEADER_H;

      // ---------- Table header ----------
      this._drawTableHeader(page, fontBold, columns, widths, y);
      y -= HEADER_ROW_H;

      // ---------- Rows ----------
      const pageRows = cappedRows.slice(
        pageIdx * rowsPerPage,
        (pageIdx + 1) * rowsPerPage
      );
      pageRows.forEach((row, i) => {
        const isAlt = i % 2 === 1;
        this._drawRow(page, font, row, columns, widths, y, isAlt);
        y -= ROW_H;
      });

      // ---------- Totals (last page only) ----------
      if (pageIdx === totalPages - 1 && totals) {
        y -= 8;
        this._drawTotals(page, font, fontBold, totals, widths, y);
      }

      // ---------- Truncation note ----------
      if (truncated && pageIdx === totalPages - 1) {
        y -= 20;
        page.drawText(
          `Showing first ${maxRows} of ${totalRows} rows. Download the Excel export for the full dataset.`,
          {
            x: MARGIN,
            y,
            font,
            size: 8.5,
            color: COLORS.muted,
          }
        );
      }

      // ---------- Footer ----------
      this._drawFooter(page, font, {
        business,
        pageNumber: pageIdx + 1,
        totalPages,
        footerNote,
      });
    }

    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  _drawHeader(page, font, fontBold, { title, subtitle, business, pageNumber, totalPages }) {
    // Purple accent bar at the very top
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 4,
      width: PAGE_W,
      height: 4,
      color: COLORS.primary,
    });

    const topY = PAGE_H - MARGIN;

    // Business name
    const bizName = business.name || 'Your Business';
    page.drawText(bizName, {
      x: MARGIN,
      y: topY - 18,
      font: fontBold,
      size: 16,
      color: COLORS.text,
    });

    // Contact line
    const contact = [business.location, business.phone, business.email]
      .filter(Boolean)
      .join('  ·  ');
    if (contact) {
      page.drawText(truncate(contact, 60), {
        x: MARGIN,
        y: topY - 36,
        font,
        size: 9,
        color: COLORS.muted,
      });
    }

    // Document title on the right
    const titleWidth = fontBold.widthOfTextAtSize(title, 13);
    page.drawText(title, {
      x: PAGE_W - MARGIN - titleWidth,
      y: topY - 18,
      font: fontBold,
      size: 13,
      color: COLORS.primary,
    });

    if (subtitle) {
      const sw = font.widthOfTextAtSize(subtitle, 9);
      page.drawText(subtitle, {
        x: PAGE_W - MARGIN - sw,
        y: topY - 36,
        font,
        size: 9,
        color: COLORS.muted,
      });
    }

    // Generated timestamp
    const stamp = `Generated ${new Date().toLocaleString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}`;
    const stampW = font.widthOfTextAtSize(stamp, 8);
    page.drawText(stamp, {
      x: PAGE_W - MARGIN - stampW,
      y: topY - 54,
      font,
      size: 8,
      color: COLORS.faint,
    });

    // Divider
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - HEADER_H + 16 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - HEADER_H + 16 },
      thickness: 0.5,
      color: COLORS.border,
    });
  }

  _drawTableHeader(page, fontBold, columns, widths, y) {
    // Purple header bar
    page.drawRectangle({
      x: MARGIN,
      y: y - HEADER_ROW_H,
      width: PAGE_W - MARGIN * 2,
      height: HEADER_ROW_H,
      color: COLORS.primary,
    });

    let x = MARGIN;
    columns.forEach((col, i) => {
      const w = widths[i];
      const label = truncate(col.label, Math.floor(w / 5.5));
      const labelWidth = fontBold.widthOfTextAtSize(label, 8.5);
      const align = col.align || 'left';

      let tx;
      if (align === 'right') tx = x + w - 8 - labelWidth;
      else if (align === 'center') tx = x + (w - labelWidth) / 2;
      else tx = x + 8;

      page.drawText(label, {
        x: tx,
        y: y - HEADER_ROW_H + 9,
        font: fontBold,
        size: 8.5,
        color: COLORS.white,
      });
      x += w;
    });
  }

  _drawRow(page, font, row, columns, widths, y, isAlt) {
    if (isAlt) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_H + 4,
        width: PAGE_W - MARGIN * 2,
        height: ROW_H - 4,
        color: COLORS.altRow,
      });
    }

    // Thin separator
    page.drawLine({
      start: { x: MARGIN, y: y - ROW_H + 4 },
      end: { x: PAGE_W - MARGIN, y: y - ROW_H + 4 },
      thickness: 0.3,
      color: COLORS.border,
    });

    let x = MARGIN;
    columns.forEach((col, i) => {
      const w = widths[i];
      const raw = col.format ? col.format(row[col.key], row) : row[col.key];
      const text = truncate(raw ?? '', Math.floor(w / 5));
      const size = col.size || 9;
      const fontToUse = col.bold ? font : font;
      const textWidth = fontToUse.widthOfTextAtSize(text, size);
      const align = col.align || 'left';

      let tx;
      if (align === 'right') tx = x + w - 8 - textWidth;
      else if (align === 'center') tx = x + (w - textWidth) / 2;
      else tx = x + 8;

      page.drawText(text, {
        x: tx,
        y: y - ROW_H + 8,
        font: fontToUse,
        size,
        color: col.color ? col.color(row) : COLORS.text,
      });
      x += w;
    });
  }

  _drawTotals(page, font, fontBold, totals, widths, y) {
    // Totals divider
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: PAGE_W - MARGIN, y: y + 6 },
      thickness: 1,
      color: COLORS.text,
    });

    let rowY = y - 12;
    Object.entries(totals).forEach(([label, value]) => {
      const isGrand = label.toLowerCase().includes('total');
      const text = `${label}:`;
      const valueStr = String(value);
      const size = isGrand ? 10 : 9.5;

      page.drawText(text, {
        x: PAGE_W - MARGIN - 220,
        y: rowY,
        font: isGrand ? fontBold : font,
        size,
        color: COLORS.muted,
      });
      const vw = (isGrand ? fontBold : font).widthOfTextAtSize(valueStr, size);
      page.drawText(valueStr, {
        x: PAGE_W - MARGIN - vw,
        y: rowY,
        font: isGrand ? fontBold : font,
        size,
        color: isGrand ? COLORS.primary : COLORS.text,
      });
      rowY -= isGrand ? 20 : 16;
    });
  }

  _drawFooter(page, font, { business, pageNumber, totalPages, footerNote }) {
    const y = MARGIN - 10;

    page.drawLine({
      start: { x: MARGIN, y: y + 22 },
      end: { x: PAGE_W - MARGIN, y: y + 22 },
      thickness: 0.5,
      color: COLORS.border,
    });

    const left = footerNote || business.name || '';
    if (left) {
      page.drawText(truncate(left, 60), {
        x: MARGIN,
        y,
        font,
        size: 8,
        color: COLORS.faint,
      });
    }

    const right = `Page ${pageNumber} of ${totalPages}`;
    const rw = font.widthOfTextAtSize(right, 8);
    page.drawText(right, {
      x: PAGE_W - MARGIN - rw,
      y,
      font,
      size: 8,
      color: COLORS.faint,
    });
  }

  /** Helper: download a Blob as a file. */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  /**
   * Single-document PDF (invoice / statement / PO) — no repeating rows
   * per page, uses a slightly different layout.
   */
  async generateInvoicePdf({
    documentType, // 'INVOICE' | 'STATEMENT' | 'PURCHASE ORDER' | 'SHIFT REPORT'
    documentNumber,
    issuedDate,
    business = {},
    partyLabel, // 'Bill to' | 'Statement for' | 'Supplier'
    party = {}, // { name, phone, email, address }
    items = [], // [{ description, qty, unitPrice, total }]
    totals = {}, // { Subtotal, Tax, Total }
    notes = '',
    meta = [], // [{ label, value }] extra rows like reference, cashier
  }) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([PAGE_W, PAGE_H]);

    let y = PAGE_H;

    // Top accent bar
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 6,
      width: PAGE_W,
      height: 6,
      color: COLORS.primary,
    });

    // Header
    y -= MARGIN + 16;
    page.drawText(business.name || 'Your Business', {
      x: MARGIN,
      y,
      font: fontBold,
      size: 20,
      color: COLORS.text,
    });

    y -= 20;
    const bizLine = [business.location, business.phone]
      .filter(Boolean)
      .join('  ·  ');
    if (bizLine) {
      page.drawText(bizLine, {
        x: MARGIN,
        y,
        font,
        size: 9.5,
        color: COLORS.muted,
      });
    }

    // Document type + number (right)
    const typeWidth = fontBold.widthOfTextAtSize(documentType, 18);
    page.drawText(documentType, {
      x: PAGE_W - MARGIN - typeWidth,
      y: PAGE_H - MARGIN - 10,
      font: fontBold,
      size: 18,
      color: COLORS.primary,
    });

    const numW = fontBold.widthOfTextAtSize(documentNumber, 11);
    page.drawText(documentNumber, {
      x: PAGE_W - MARGIN - numW,
      y: PAGE_H - MARGIN - 32,
      font: fontBold,
      size: 11,
      color: COLORS.text,
    });

    const dateW = font.widthOfTextAtSize(issuedDate, 9);
    page.drawText(issuedDate, {
      x: PAGE_W - MARGIN - dateW,
      y: PAGE_H - MARGIN - 48,
      font,
      size: 9,
      color: COLORS.muted,
    });

    // Divider
    y = PAGE_H - HEADER_H - 10;
    page.drawLine({
      start: { x: MARGIN, y: y + 30 },
      end: { x: PAGE_W - MARGIN, y: y + 30 },
      thickness: 0.7,
      color: COLORS.border,
    });

    // Party box
    y -= 40;
    const partyBoxH = meta.length > 0 ? 80 : 70;
    page.drawRectangle({
      x: MARGIN,
      y: y - partyBoxH + 20,
      width: PAGE_W - MARGIN * 2,
      height: partyBoxH,
      color: COLORS.primaryLight,
    });

    page.drawText(partyLabel.toUpperCase(), {
      x: MARGIN + 16,
      y: y - 4,
      font: fontBold,
      size: 8,
      color: COLORS.primary,
    });

    page.drawText(party.name || '—', {
      x: MARGIN + 16,
      y: y - 22,
      font: fontBold,
      size: 12,
      color: COLORS.text,
    });

    const partyContact = [party.phone, party.email, party.address]
      .filter(Boolean)
      .join('  ·  ');
    if (partyContact) {
      page.drawText(truncate(partyContact, 70), {
        x: MARGIN + 16,
        y: y - 38,
        font,
        size: 9,
        color: COLORS.muted,
      });
    }

    // Meta (right side of party box)
    let metaY = y - 4;
    meta.forEach(m => {
      const labelW = font.widthOfTextAtSize(`${m.label}:`, 9);
      page.drawText(`${m.label}:`, {
        x: PAGE_W - MARGIN - 200,
        y: metaY,
        font,
        size: 9,
        color: COLORS.muted,
      });
      const valW = fontBold.widthOfTextAtSize(String(m.value), 9);
      page.drawText(String(m.value), {
        x: PAGE_W - MARGIN - 16 - valW,
        y: metaY,
        font: fontBold,
        size: 9,
        color: COLORS.text,
      });
      metaY -= 16;
    });

    y -= partyBoxH + 20;

    // ---------- Items table ----------
    const itemCols = [
      { label: 'Description', w: 280, align: 'left' },
      { label: 'Qty', w: 55, align: 'right' },
      { label: 'Unit price', w: 85, align: 'right' },
      { label: 'Total', w: 95, align: 'right' },
    ];

    // Table header
    page.drawRectangle({
      x: MARGIN,
      y: y - 26,
      width: PAGE_W - MARGIN * 2,
      height: 26,
      color: COLORS.primary,
    });

    let x = MARGIN;
    itemCols.forEach(col => {
      const lw = fontBold.widthOfTextAtSize(col.label, 9);
      const tx = col.align === 'right' ? x + col.w - 12 - lw : x + 12;
      page.drawText(col.label, {
        x: tx,
        y: y - 18,
        font: fontBold,
        size: 9,
        color: COLORS.white,
      });
      x += col.w;
    });

    y -= 26;

    // Items
    items.forEach((item, i) => {
      if (y < MARGIN + 200) {
        // Page break
        this._drawFooter(page, font, {
          business,
          pageNumber: 1,
          totalPages: 1,
        });
        const newPage = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        page = newPage; // eslint-disable-line no-param-reassign
      }

      if (i % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - 20,
          width: PAGE_W - MARGIN * 2,
          height: 20,
          color: COLORS.altRow,
        });
      }

      let cx = MARGIN;
      const values = [
        truncate(item.description, 48),
        String(item.qty ?? ''),
        moneyFmt(item.unitPrice),
        moneyFmt(item.total),
      ];
      values.forEach((val, vi) => {
        const col = itemCols[vi];
        const size = 9.5;
        const vw = font.widthOfTextAtSize(val, size);
        const tx = col.align === 'right' ? cx + col.w - 12 - vw : cx + 12;
        page.drawText(val, {
          x: tx,
          y: y - 14,
          font,
          size,
          color: COLORS.text,
        });
        cx += col.w;
      });

      y -= 20;
    });

    // ---------- Totals ----------
    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: PAGE_W - MARGIN, y: y + 6 },
      thickness: 0.7,
      color: COLORS.border,
    });

    let totalY = y - 12;
    const totalEntries = Object.entries(totals);
    totalEntries.forEach(([label, value], i) => {
      const isGrand = i === totalEntries.length - 1;
      const size = isGrand ? 12 : 10;
      page.drawText(label, {
        x: PAGE_W - MARGIN - 220,
        y: totalY,
        font: isGrand ? fontBold : font,
        size,
        color: isGrand ? COLORS.text : COLORS.muted,
      });
      const valueStr = moneyFmt(value);
      const vw = (isGrand ? fontBold : font).widthOfTextAtSize(valueStr, size);
      page.drawText(valueStr, {
        x: PAGE_W - MARGIN - vw,
        y: totalY,
        font: isGrand ? fontBold : font,
        size,
        color: isGrand ? COLORS.primary : COLORS.text,
      });
      totalY -= isGrand ? 24 : 18;
    });

    // ---------- Notes ----------
    if (notes) {
      totalY -= 20;
      page.drawText('Notes', {
        x: MARGIN,
        y: totalY,
        font: fontBold,
        size: 9,
        color: COLORS.muted,
      });
      totalY -= 14;
      const lines = this._wrapText(notes, 95);
      lines.forEach(line => {
        page.drawText(line, {
          x: MARGIN,
          y: totalY,
          font,
          size: 9,
          color: COLORS.text,
        });
        totalY -= 12;
      });
    }

    this._drawFooter(page, font, {
      business,
      pageNumber: 1,
      totalPages: 1,
      footerNote: 'Thank you for your business',
    });

    const bytes = await doc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  _wrapText(text, maxChars) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = '';
    words.forEach(w => {
      if ((current + ' ' + w).trim().length > maxChars) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = (current + ' ' + w).trim();
      }
    });
    if (current) lines.push(current);
    return lines;
  }
}

export const pdfService = new PdfService();