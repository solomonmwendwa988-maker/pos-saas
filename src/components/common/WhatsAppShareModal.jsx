import { useEffect, useMemo, useState } from 'react';
import { Phone, Send } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import WhatsAppIcon from '@/components/common/WhatsAppIcon';
import { whatsappService } from '@/services/whatsappService';
import { useToast } from '@/context/ToastContext';
import {
  isValidKenyanPhone,
  formatKenyanPhone,
} from '@/utils/phone';

/**
 * Modal that lets the user pick a phone number (or skip) and send the
 * pre-built message via WhatsApp.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.defaultPhone]  Pre-filled phone (from a customer record)
 * @param {string} [props.customerName]
 * @param {string} props.message         Plain-text message to send
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {() => void} props.onClose
 */
export default function WhatsAppShareModal({
  open,
  defaultPhone = '',
  customerName = '',
  message,
  title = 'Send on WhatsApp',
  subtitle = '',
  onClose,
}) {
  const toast = useToast();
  const [phone, setPhone] = useState(defaultPhone);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone || '');
      setError('');
      setBusy(false);
    }
  }, [open, defaultPhone]);

  const preview = useMemo(() => {
    // Show a compact preview of the message — first ~6 lines
    const lines = (message || '').split('\n');
    const head = lines.slice(0, 8).join('\n');
    return lines.length > 8 ? `${head}\n…` : head;
  }, [message]);

  const send = () => {
    setError('');
    setBusy(true);
    try {
      const trimmed = phone.trim();
      if (trimmed && !isValidKenyanPhone(trimmed)) {
        setError('Enter a valid Kenyan phone number, or leave it blank to pick a contact in WhatsApp.');
        setBusy(false);
        return;
      }
      whatsappService.open({ phone: trimmed || null, message });
      toast.success(
        trimmed
          ? `Opening WhatsApp chat with ${formatKenyanPhone(trimmed)}`
          : 'Opening WhatsApp — pick a contact to send.'
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Could not open WhatsApp.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={
        customerName
          ? `Customer: ${customerName}`
          : subtitle || 'Send this receipt as a WhatsApp message'
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={send}
            loading={busy}
            leftIcon={<Send size={14} />}
          >
            Open WhatsApp
          </Button>
        </>
      }
    >
      <div className="wa-share">
        <div className="wa-share-header">
          <span className="wa-share-brand">
            <WhatsAppIcon size={18} />
            <span>WhatsApp</span>
          </span>
        </div>

        <Input
          label="Customer phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0712 345 678"
          leftIcon={<Phone size={15} />}
          hint="Leave blank to pick a contact inside WhatsApp."
        />

        {error && <div className="wa-share-error">{error}</div>}

        <div className="wa-share-preview-label">Message preview</div>
        <pre className="wa-share-preview">{preview}</pre>

        <div className="wa-share-note">
          Opens WhatsApp on your phone, or WhatsApp Web on your computer.
          Sending is manual — you press send inside WhatsApp.
        </div>
      </div>

      <style>{`
        .wa-share { display: flex; flex-direction: column; gap: 14px; }
        .wa-share-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .wa-share-brand {
          display: inline-flex; align-items: center; gap: 8px;
          color: #25D366; font-weight: 700; font-size: 13.5px;
        }
        .wa-share-error {
          padding: 10px 14px; border-radius: 10px;
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca;
          font-size: 12.5px; font-weight: 500; line-height: 1.5;
        }
        .wa-share-preview-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--text-faint);
        }
        .wa-share-preview {
          background: #f6f7fb;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.65;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 240px;
          overflow-y: auto;
          margin: 0;
        }
        .wa-share-note {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.55;
          padding: 10px 12px;
          background: var(--bg-soft);
          border-radius: 10px;
        }
      `}</style>
    </Modal>
  );
}