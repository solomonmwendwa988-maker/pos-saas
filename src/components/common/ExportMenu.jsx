import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import './ExportMenu.css';

export default function ExportMenu({
  onExportPdf,
  onExportExcel,
  pdfLabel = 'Export as PDF',
  excelLabel = 'Export as Excel',
  label = 'Export',
  disabled = false,
  busy = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const handle = fn => e => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    fn?.();
  };

  return (
    <div className="em" ref={ref}>
      <button
        type="button"
        className="em-trigger"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={14} />
        <span>{busy ? 'Exporting…' : label}</span>
        <ChevronDown size={13} className={`em-chev ${open ? 'on' : ''}`} />
      </button>

      {open && (
        <div className="em-panel fade-in" role="menu">
          {onExportPdf && (
            <button
              type="button"
              className="em-item"
              onClick={handle(onExportPdf)}
            >
              <span className="em-icon em-icon-pdf">
                <FileText size={15} />
              </span>
              <span className="em-item-body">
                <span className="em-item-label">{pdfLabel}</span>
                <span className="em-item-hint">Print-ready A4 document</span>
              </span>
            </button>
          )}
          {onExportExcel && (
            <button
              type="button"
              className="em-item"
              onClick={handle(onExportExcel)}
            >
              <span className="em-icon em-icon-xls">
                <FileSpreadsheet size={15} />
              </span>
              <span className="em-item-body">
                <span className="em-item-label">{excelLabel}</span>
                <span className="em-item-hint">Editable spreadsheet</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}