/**
 * Cross-entity search.
 * Reads from the same storage layer the services use, so results are always
 * consistent with what the user sees on each page. Returns a flat list of
 * typed results — the UI decides how to group them.
 */
import { storage } from './storage';
import { formatKSh } from '@/utils/format';

const LATENCY = 30; // keeps the async contract but imperceptible

const safeRead = key => {
  const v = storage.read(key, []);
  return Array.isArray(v) ? v : [];
};

class SearchService {
  async search(query, { limit = 6 } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    await new Promise(r => setTimeout(r, LATENCY));

    const products = safeRead('products');
    const orders = safeRead('orders');
    const customers = safeRead('customers');
    const suppliers = safeRead('suppliers');

    const results = [];

    // Products — match name, SKU or barcode
    products
      .filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        (p.barcode && String(p.barcode).includes(q))
      )
      .slice(0, limit)
      .forEach(p => {
        results.push({
          kind: 'product',
          id: p.id,
          label: p.name,
          sublabel: [p.sku, p.category, `${p.stock} in stock`].filter(Boolean).join(' · '),
          to: `/products?focus=${p.id}`,
        });
      });

    // Orders — match id, customer, reference
    orders
      .filter(o =>
        String(o.id).includes(q) ||
        o.customer?.toLowerCase().includes(q) ||
        o.reference?.toLowerCase().includes(q)
      )
      .slice(0, limit)
      .forEach(o => {
        results.push({
          kind: 'order',
          id: o.id,
          label: `Order #${o.id}`,
          sublabel: [o.customer, formatKSh(o.total), o.method].filter(Boolean).join(' · '),
          to: `/sales?order=${o.id}`,
        });
      });

    // Customers — match name, phone, email
    customers
      .filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
      .slice(0, limit)
      .forEach(c => {
        results.push({
          kind: 'customer',
          id: c.id,
          label: c.name,
          sublabel: [c.phone, c.email].filter(Boolean).join(' · '),
          to: `/customers/${c.id}`,
        });
      });

    // Suppliers — match name, contact, phone
    suppliers
      .filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.contact?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      )
      .slice(0, limit)
      .forEach(s => {
        results.push({
          kind: 'supplier',
          id: s.id,
          label: s.name,
          sublabel: [s.contact, s.phone].filter(Boolean).join(' · '),
          to: `/suppliers?focus=${s.id}`,
        });
      });

    return results;
  }
}

export const searchService = new SearchService();