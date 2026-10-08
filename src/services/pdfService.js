import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
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

    const tableWidth = PAGE_W - MARGIN * 2;
    const totalColWidth =
      columns.reduce((s, c) => s + (c.width || 0), 0) || 1;
    const widths = columns.map(c =>
      c.width
        ? (c.width / totalColWidth) * tableWidth
        : tableWidth / columns.length
    );

    const usableHeight = PAGE_H - HEADER_H - FOOTER_H - 20;
    const rowsPerPage = Math.max(
      5,
      Math.floor((usableHeight - HEADER_ROW_H) / ROW_H)
    );
    const totalPages = Math.max(1, Math.ceil(cappedRows.length / rowsPerPage));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = doc.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H;

      this._drawHeader(page, font, fontBold, {
        title,
        subtitle,
        business,
        pageNumber: pageIdx + 1,
        totalPages,
      });

      y = PAGE_H - HEADER_H;
      this._drawTableHeader(page, fontBold, columns, widths, y);
      y -= HEADER_ROW_H;

      const pageRows = cappedRows.slice(
        pageIdx * rowsPerPage,
        (pageIdx + 1) * rowsPerPage
      );
      pageRows.forEach((row, i) => {
        const isAlt = i % 2 === 1;
        this._drawRow(page, font, row, columns, widths, y, isAlt);
        y -= ROW_H;
      });

      if (pageIdx === totalPages - 1 && totals) {
        y -= 8;
        this._drawTotals(page, font, fontBold, totals, widths, y);
      }

      if (truncated && pageIdx === totalPages - 1) {
        y -= 20;
        page.drawText(
          `Showing first ${maxRows} of ${totalRows} rows. Download the Excel export for the full dataset.`,
          { x: MARGIN, y, font, size: 8.5, color: COLORS.muted }
        );
      }

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

  _drawHeader(
    page,
    font,
    fontBold,
    { title, subtitle, business, pageNumber, totalPages }
  ) {
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 4,
      width: PAGE_W,
      height: 4,
      color: COLORS.primary,
    });

    const topY = PAGE_H - MARGIN;
    const bizName = business.name || 'Your Business';
    page.drawText(bizName, {
      x: MARGIN,
      y: topY - 18,
      font: fontBold,
      size: 16,
      color: COLORS.text,
    });

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

    const stamp = `Generated ${new Date().toLocaleString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const stampW = font.widthOfTextAtSize(stamp, 8);
    page.drawText(stamp, {
      x: PAGE_W - MARGIN - stampW,
      y: topY - 54,
      font,
      size: 8,
      color: COLORS.faint,
    });

    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - HEADER_H + 16 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - HEADER_H + 16 },
      thickness: 0.5,
      color: COLORS.border,
    });
  }

  _drawTableHeader(page, fontBold, columns, widths, y) {
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
      const textWidth = font.widthOfTextAtSize(text, size);
      const align = col.align || 'left';

      let tx;
      if (align === 'right') tx = x + w - 8 - textWidth;
      else if (align === 'center') tx = x + (w - textWidth) / 2;
      else tx = x + 8;

      page.drawText(text, {
        x: tx,
        y: y - ROW_H + 8,
        font,
        size,
        color: col.color ? col.color(row) : COLORS.text,
      });
      x += w;
    });
  }

  _drawTotals(page, font, fontBold, totals, widths, y) {
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

  /**
   * Single-document PDF (invoice / statement / purchase order / receipt).
   *
   * Supports:
   *  - items, totals, notes, meta
   *  - payments[] — split payment breakdown
   *  - cash — { tendered, change }
   *  - loyalty — { pointsEarned, pointsRedeemed, valueRedeemed, balance }
   */
  async generateInvoicePdf({
    documentType,
    documentNumber,
    issuedDate,
    business = {},
    partyLabel,
    party = {},
    items = [],
    totals = {},
    notes = '',
    meta = [],
    payments = [],
    loyalty = null,
    cash = null,
  }) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    let page = doc.addPage([PAGE_W, PAGE_H]);

    let y = PAGE_H;

    // Top accent
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 8,
      width: PAGE_W,
      height: 8,
      color: COLORS.primary,
    });

    // Business header
    y -= MARGIN + 12;
    page.drawText(business.name || 'Your Business', {
      x: MARGIN,
      y,
      font: fontBold,
      size: 22,
      color: COLORS.text,
    });

    y -= 22;
    const bizLine = [business.location, business.phone, business.email]
      .filter(Boolean)
      .join('  ·  ');
    if (bizLine) {
      page.drawText(truncate(bizLine, 75), {
        x: MARGIN,
        y,
        font,
        size: 9.5,
        color: COLORS.muted,
      });
    }

    // Document badge
    const badgeW = 175;
    const badgeH = 62;
    const badgeX = PAGE_W - MARGIN - badgeW;
    const badgeY = PAGE_H - MARGIN - 62;
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      color: COLORS.primaryLight,
      borderColor: COLORS.primary,
      borderWidth: 1,
    });
    const typeW = fontBold.widthOfTextAtSize(documentType, 12);
    page.drawText(documentType, {
      x: badgeX + (badgeW - typeW) / 2,
      y: badgeY + badgeH - 20,
      font: fontBold,
      size: 12,
      color: COLORS.primary,
    });
    const numW = fontBold.widthOfTextAtSize(documentNumber, 16);
    page.drawText(documentNumber, {
      x: badgeX + (badgeW - numW) / 2,
      y: badgeY + 14,
      font: fontBold,
      size: 16,
      color: COLORS.text,
    });

    // Meta strip
    y = PAGE_H - MARGIN - 80;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.7,
      color: COLORS.border,
    });

    y -= 16;
    page.drawText(`Issued: ${issuedDate}`, {
      x: MARGIN,
      y,
      font,
      size: 9.5,
      color: COLORS.muted,
    });

    if (meta.length) {
      let my = y;
      meta.forEach(m => {
        const labelW = font.widthOfTextAtSize(`${m.label}:`, 9.5);
        page.drawText(`${m.label}:`, {
          x: PAGE_W - MARGIN - labelW - 100,
          y: my,
          font,
          size: 9.5,
          color: COLORS.muted,
        });
        const valW = fontBold.widthOfTextAtSize(String(m.value), 9.5);
        page.drawText(String(m.value), {
          x: PAGE_W - MARGIN - valW,
          y: my,
          font: fontBold,
          size: 9.5,
          color: COLORS.text,
        });
        my -= 14;
      });
    }

    // Party box
    y -= 30;
    const boxH = 60;
    page.drawRectangle({
      x: MARGIN,
      y: y - boxH,
      width: PAGE_W - MARGIN * 2,
      height: boxH,
      color: COLORS.altRow,
      borderColor: COLORS.border,
      borderWidth: 0.5,
    });
    page.drawText((partyLabel || 'CUSTOMER').toUpperCase(), {
      x: MARGIN + 16,
      y: y - 18,
      font: fontBold,
      size: 8,
      color: COLORS.primary,
    });
    page.drawText(party.name || '—', {
      x: MARGIN + 16,
      y: y - 38,
      font: fontBold,
      size: 12.5,
      color: COLORS.text,
    });
    const partyContact = [party.phone, party.email, party.address]
      .filter(Boolean)
      .join('  ·  ');
    if (partyContact) {
      page.drawText(truncate(partyContact, 75), {
        x: MARGIN + 16,
        y: y - 52,
        font,
        size: 9,
        color: COLORS.muted,
      });
    }

    y -= boxH + 20;

    // Items table
    const itemCols = [
      { label: 'Item', w: 260, align: 'left' },
      { label: 'Qty', w: 55, align: 'right' },
      { label: 'Unit price', w: 95, align: 'right' },
      { label: 'Line total', w: 100, align: 'right' },
    ];

    page.drawRectangle({
      x: MARGIN,
      y: y - 26,
      width: PAGE_W - MARGIN * 2,
      height: 26,
      color: COLORS.primary,
    });
    let cx = MARGIN;
    itemCols.forEach(col => {
      const lw = fontBold.widthOfTextAtSize(col.label, 9);
      const tx = col.align === 'right' ? cx + col.w - 12 - lw : cx + 12;
      page.drawText(col.label, {
        x: tx,
        y: y - 18,
        font: fontBold,
        size: 9,
        color: COLORS.white,
      });
      cx += col.w;
    });
    y -= 26;

    items.forEach((item, i) => {
      if (y < MARGIN + 260) {
        this._drawFooter(page, font, {
          business,
          pageNumber: 1,
          totalPages: 1,
        });
        page = doc.addPage([PAGE_W, PAGE_H]); // eslint-disable-line no-param-reassign
        y = PAGE_H - MARGIN;
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
      let cx2 = MARGIN;
      const values = [
        truncate(item.description, 46),
        String(item.qty ?? ''),
        moneyFmt(item.unitPrice),
        moneyFmt(item.total),
      ];
      values.forEach((val, vi) => {
        const col = itemCols[vi];
        const size = 9.5;
        const vw = font.widthOfTextAtSize(val, size);
        const tx = col.align === 'right' ? cx2 + col.w - 12 - vw : cx2 + 12;
        page.drawText(val, {
          x: tx,
          y: y - 14,
          font,
          size,
          color: COLORS.text,
        });
        cx2 += col.w;
      });
      y -= 20;
    });

    // Totals
    y -= 12;
    page.drawLine({
      start: { x: PAGE_W - MARGIN - 280, y: y + 6 },
      end: { x: PAGE_W - MARGIN, y: y + 6 },
      thickness: 0.7,
      color: COLORS.border,
    });

    let totalY = y - 14;
    const totalEntries = Object.entries(totals);
    totalEntries.forEach(([label, value], i) => {
      const isGrand = i === totalEntries.length - 1;
      const size = isGrand ? 13 : 10.5;
      page.drawText(label, {
        x: PAGE_W - MARGIN - 240,
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
      totalY -= isGrand ? 26 : 18;
    });

    // Cash tendered / change
    if (cash && cash.tendered !== undefined) {
      totalY -= 8;
      page.drawLine({
        start: { x: MARGIN, y: totalY + 10 },
        end: { x: PAGE_W - MARGIN, y: totalY + 10 },
        thickness: 0.4,
        color: COLORS.border,
      });
      [
        { label: 'Cash received', value: cash.tendered },
        { label: 'Change given', value: cash.change },
      ].forEach(l => {
        page.drawText(l.label, {
          x: MARGIN,
          y: totalY - 4,
          font,
          size: 10,
          color: COLORS.muted,
        });
        const v = moneyFmt(l.value);
        const vw = fontBold.widthOfTextAtSize(v, 10);
        page.drawText(v, {
          x: PAGE_W - MARGIN - vw,
          y: totalY - 4,
          font: fontBold,
          size: 10,
          color: COLORS.text,
        });
        totalY -= 16;
      });
    }

    // Split payments
    if (payments && payments.length > 0) {
      totalY -= 10;
      page.drawText('Payment received', {
        x: MARGIN,
        y: totalY,
        font: fontBold,
        size: 9.5,
        color: COLORS.muted,
      });
      totalY -= 16;
      payments.forEach(p => {
        const method =
          p.method === 'mpesa' || p.method === 'M-Pesa'
            ? 'M-Pesa'
            : p.method === 'cash' || p.method === 'Cash'
            ? 'Cash'
            : p.method === 'On credit'
            ? 'On credit'
            : p.method || 'Payment';
        const ref = p.reference ? `  ·  Ref ${p.reference}` : '';
        page.drawText(`${method}${ref}`, {
          x: MARGIN,
          y: totalY,
          font,
          size: 9.5,
          color: COLORS.text,
        });
        const amountStr = moneyFmt(p.amount);
        const aw = fontBold.widthOfTextAtSize(amountStr, 9.5);
        page.drawText(amountStr, {
          x: PAGE_W - MARGIN - aw,
          y: totalY,
          font: fontBold,
          size: 9.5,
          color: COLORS.text,
        });
        totalY -= 14;
      });
    }

    // Loyalty
    if (
      loyalty &&
      (loyalty.pointsEarned || loyalty.pointsRedeemed || loyalty.balance)
    ) {
      totalY -= 12;
      page.drawRectangle({
        x: MARGIN,
        y: totalY - 46,
        width: PAGE_W - MARGIN * 2,
        height: 60,
        color: COLORS.primaryLight,
      });
      page.drawText('Loyalty rewards', {
        x: MARGIN + 12,
        y: totalY - 4,
        font: fontBold,
        size: 9,
        color: COLORS.primary,
      });
      let ly = totalY - 20;
      if (loyalty.pointsEarned > 0) {
        page.drawText(`Points earned: +${loyalty.pointsEarned}`, {
          x: MARGIN + 12,
          y: ly,
          font,
          size: 9.5,
          color: COLORS.text,
        });
        ly -= 12;
      }
      if (loyalty.pointsRedeemed > 0) {
        page.drawText(
          `Points redeemed: -${loyalty.pointsRedeemed} (KSh ${loyalty.valueRedeemed})`,
          { x: MARGIN + 12, y: ly, font, size: 9.5, color: COLORS.text }
        );
        ly -= 12;
      }
      if (loyalty.balance !== undefined) {
        page.drawText(`New points balance: ${loyalty.balance}`, {
          x: MARGIN + 12,
          y: ly,
          font: fontBold,
          size: 9.5,
          color: COLORS.text,
        });
      }
      totalY -= 60;
    }

    // Notes
    if (notes) {
      totalY -= 14;
      page.drawText('Notes', {
        x: MARGIN,
        y: totalY,
        font: fontBold,
        size: 9,
        color: COLORS.muted,
      });
      totalY -= 14;
      this._wrapText(notes, 95).forEach(line => {
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

    // Thank you
    page.drawText('Thank you for shopping with us. Karibu tena.', {
      x: MARGIN,
      y: MARGIN + 22,
      font: fontBold,
      size: 11,
      color: COLORS.primary,
    });

    this._drawFooter(page, font, {
      business,
      pageNumber: 1,
      totalPages: 1,
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

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }
}

export const pdfService = new PdfService();