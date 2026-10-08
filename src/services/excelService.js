import XLSX from 'xlsx-js-style';

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '6D5EFC' } },
  alignment: { vertical: 'center', horizontal: 'left' },
  border: {
    top: { style: 'thin', color: { rgb: '4A3AD9' } },
    bottom: { style: 'thin', color: { rgb: '4A3AD9' } },
    left: { style: 'thin', color: { rgb: '4A3AD9' } },
    right: { style: 'thin', color: { rgb: '4A3AD9' } },
  },
};

const BODY_STYLE = {
  font: { sz: 10 },
  alignment: { vertical: 'center' },
};

const ALT_ROW_FILL = { fgColor: { rgb: 'F6F7FB' } };
const MONEY_FMT = '"KSh "#,##0.00';
const INT_FMT = '#,##0';
const DATE_FMT = 'yyyy-mm-dd';

class ExcelService {
  /**
   * Export rows to a styled .xlsx file.
   *
   * @param {object} opts
   * @param {string} opts.filename
   * @param {string} [opts.sheetName]
   * @param {Array}  opts.columns  [{ key, label, width, type, align }]
   * @param {Array}  opts.rows
   * @param {object} [opts.meta]   Optional key/value pairs shown above the table
   */
  exportRows({ filename, sheetName = 'Report', columns, rows, meta }) {
    const data = [];

    // Optional meta block at the top
    if (meta && Object.keys(meta).length > 0) {
      Object.entries(meta).forEach(([k, v]) => {
        data.push([k, v]);
      });
      data.push([]);
    }

    // Column headers
    data.push(columns.map(c => c.label));

    // Rows
    rows.forEach(row => {
      data.push(columns.map(c => row[c.key] ?? ''));
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = columns.map(c => ({
      wch: c.width || Math.max(12, c.label.length + 4),
    }));

    // Start row index of the header (after any meta)
    const headerRowIdx =
      meta && Object.keys(meta).length > 0
        ? Object.keys(meta).length + 1
        : 0;

    // Freeze below the header row
    ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };

    // Apply styles to header
    columns.forEach((col, colIdx) => {
      const addr = XLSX.utils.encode_cell({
        r: headerRowIdx,
        c: colIdx,
      });
      if (ws[addr]) {
        ws[addr].s = {
          ...HEADER_STYLE,
          alignment: {
            ...HEADER_STYLE.alignment,
            horizontal: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left',
          },
        };
      }
    });

    // Apply styles to body rows
    rows.forEach((row, rowIdx) => {
      const r = headerRowIdx + 1 + rowIdx;
      columns.forEach((col, colIdx) => {
        const addr = XLSX.utils.encode_cell({ r, c: colIdx });
        if (!ws[addr]) return;

        const isAlt = rowIdx % 2 === 1;
        const style = {
          ...BODY_STYLE,
          alignment: {
            ...BODY_STYLE.alignment,
            horizontal:
              col.align === 'right'
                ? 'right'
                : col.align === 'center'
                ? 'center'
                : 'left',
          },
        };

        if (isAlt) style.fill = ALT_ROW_FILL;

        if (col.type === 'money') {
          style.numFmt = MONEY_FMT;
        } else if (col.type === 'int') {
          style.numFmt = INT_FMT;
        } else if (col.type === 'date') {
          style.numFmt = DATE_FMT;
        } else if (col.type === 'bold') {
          style.font = { ...BODY_STYLE.font, bold: true };
        }

        ws[addr].s = style;
      });
    });

    // Autofilter on the header row
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: headerRowIdx, c: 0 },
        e: { r: headerRowIdx + rows.length, c: columns.length - 1 },
      }),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, filename, { compression: true });
    return { ok: true, filename };
  }

  /**
   * Multi-sheet workbook — one sheet per key in `sheets`.
   * sheets = { 'Sales': { columns, rows }, 'Aging': { columns, rows } }
   */
  exportWorkbook({ filename, sheets }) {
    const wb = XLSX.utils.book_new();

    Object.entries(sheets).forEach(([sheetName, { columns, rows, meta }]) => {
      const data = [];
      if (meta && Object.keys(meta).length > 0) {
        Object.entries(meta).forEach(([k, v]) => data.push([k, v]));
        data.push([]);
      }
      data.push(columns.map(c => c.label));
      rows.forEach(row => {
        data.push(columns.map(c => row[c.key] ?? ''));
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = columns.map(c => ({
        wch: c.width || Math.max(12, c.label.length + 4),
      }));

      const headerRowIdx =
        meta && Object.keys(meta).length > 0
          ? Object.keys(meta).length + 1
          : 0;

      columns.forEach((col, colIdx) => {
        const addr = XLSX.utils.encode_cell({
          r: headerRowIdx,
          c: colIdx,
        });
        if (ws[addr]) {
          ws[addr].s = {
            ...HEADER_STYLE,
            alignment: {
              ...HEADER_STYLE.alignment,
              horizontal:
                col.align === 'right' ? 'right' : 'left',
            },
          };
        }
      });

      rows.forEach((row, rowIdx) => {
        const r = headerRowIdx + 1 + rowIdx;
        columns.forEach((col, colIdx) => {
          const addr = XLSX.utils.encode_cell({ r, c: colIdx });
          if (!ws[addr]) return;
          const isAlt = rowIdx % 2 === 1;
          const style = {
            ...BODY_STYLE,
            alignment: {
              ...BODY_STYLE.alignment,
              horizontal:
                col.align === 'right'
                  ? 'right'
                  : col.align === 'center'
                  ? 'center'
                  : 'left',
            },
          };
          if (isAlt) style.fill = ALT_ROW_FILL;
          if (col.type === 'money') style.numFmt = MONEY_FMT;
          else if (col.type === 'int') style.numFmt = INT_FMT;
          else if (col.type === 'date') style.numFmt = DATE_FMT;
          else if (col.type === 'bold')
            style.font = { ...BODY_STYLE.font, bold: true };
          ws[addr].s = style;
        });
      });

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });

    XLSX.writeFile(wb, filename, { compression: true });
    return { ok: true, filename };
  }
}

export const excelService = new ExcelService();