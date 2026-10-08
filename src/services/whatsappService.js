/**
 * WhatsApp receipt sharing.
 *
 * Uses the public `wa.me` deep link — no API, no keys, no backend.
 * On mobile it opens the WhatsApp app. On desktop it opens WhatsApp Web.
 *
 * When a phone is provided, WhatsApp opens a chat with that number
 * pre-filled. When it isn't, WhatsApp opens the share sheet and the
 * cashier picks the contact.
 *
 * WhatsApp message formatting:
 *   *bold*  _italic_  ~strikethrough~  ```monospace```
 */

import { normalizeKenyanPhone } from '@/utils/phone';
import { formatKSh } from '@/utils/format';

function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

class WhatsAppService {
  /**
   * Builds the plain-text receipt message for a completed sale.
   */
  buildReceiptMessage({ business, order, footerNote }) {
    const lines = [];

    // Header — business info
    lines.push(`*${business?.name || 'Your Business'}*`);
    const contact = [business?.location, business?.phone]
      .filter(Boolean)
      .join(' · ');
    if (contact) lines.push(contact);
    lines.push('');

    // Order info
    lines.push(`Receipt #${order.id}`);
    lines.push(formatDateShort(order.date || new Date().toISOString()));
    lines.push('');

    // Items
    lines.push('*Items*');
    (order.itemsList || []).forEach(i => {
      const qty = i.qty > 1 ? ` × ${i.qty}` : '';
      const lineTotal = formatKSh((Number(i.price) || 0) * (Number(i.qty) || 0));
      lines.push(`${i.name}${qty} — ${lineTotal}`);
    });
    lines.push('');

    // Totals
    if (order.subtotal) {
      lines.push(`Subtotal: ${formatKSh(order.subtotal)}`);
    }
    if (order.discount > 0) {
      lines.push(`Discount: -${formatKSh(order.discount)}`);
    }
    if (order.tax) {
      lines.push(`VAT: ${formatKSh(order.tax)}`);
    }
    lines.push(`*Total: ${formatKSh(order.total)}*`);
    lines.push('');

    // Payment info
    if (order.paymentStatus === 'credit') {
      lines.push(`*Charged on credit*`);
      lines.push(`Customer: ${order.customer || '—'}`);
    } else {
      lines.push(`Paid via *${order.method}*`);
      if (order.reference) {
        lines.push(`Reference: ${order.reference}`);
      }
    }
    if (order.cashier) {
      lines.push(`Served by: ${order.cashier}`);
    }

    // Footer
    if (footerNote) {
      lines.push('');
      lines.push(footerNote);
    }

    return lines.join('\n');
  }

  /**
   * Builds the plain-text purchase-order message.
   */
  buildPurchaseOrderMessage({ business, po, footerNote }) {
    const lines = [];
    lines.push(`*${business?.name || 'Your Business'}*`);
    const contact = [business?.location, business?.phone]
      .filter(Boolean)
      .join(' · ');
    if (contact) lines.push(contact);
    lines.push('');
    lines.push(`*Purchase Order ${po.number}*`);
    lines.push(`Supplier: ${po.supplierName}`);
    if (po.expectedAt) {
      lines.push(
        `Expected: ${new Date(po.expectedAt).toLocaleDateString('en-KE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      );
    }
    lines.push('');
    lines.push('*Items*');
    po.items.forEach(i => {
      const lineTotal = formatKSh(
        (Number(i.buyingPrice) || 0) * (Number(i.qty) || 0)
      );
      lines.push(`${i.name} — ${i.qty} × ${formatKSh(i.buyingPrice)} = ${lineTotal}`);
    });
    lines.push('');
    lines.push(`*Total: ${formatKSh(po.total)}*`);
    if (po.notes) {
      lines.push('');
      lines.push(`Notes: ${po.notes}`);
    }
    if (footerNote) {
      lines.push('');
      lines.push(footerNote);
    }
    return lines.join('\n');
  }

  /**
   * Builds the WhatsApp URL.
   *
   * @param {object} opts
   * @param {string} [opts.phone]  Raw phone number — normalized internally.
   *                                If omitted, opens WhatsApp's share sheet.
   * @param {string} opts.message  Plain text to pre-fill.
   */
  buildUrl({ phone, message }) {
    const text = encodeURIComponent(message || '');
    const normalized = phone ? normalizeKenyanPhone(phone) : null;

    if (normalized) {
      return `https://wa.me/${normalized}?text=${text}`;
    }
    // No phone — open WhatsApp's contact picker with the message pre-filled.
    return `https://wa.me/?text=${text}`;
  }

  /**
   * Opens the WhatsApp share link.
   * Uses window.open with a new tab so the app stays on the current page.
   */
  open({ phone, message }) {
    const url = this.buildUrl({ phone, message });
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Popup blocked — fall back to navigation
      window.location.href = url;
    }
    return url;
  }
}

export const whatsappService = new WhatsAppService();