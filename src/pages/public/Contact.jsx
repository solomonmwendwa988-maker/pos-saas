import { useState } from 'react';
import { Building2, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import PublicNav from '@/components/layout/PublicNav';
import Footer from '@/components/layout/Footer';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';

const TOPICS = ['Sales enquiry', 'Support request', 'Partnership', 'Press', 'Other'];

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', topic: TOPICS[0], message: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.';
    if (form.phone && !/^(?:\+254|0)(7\d{8}|1\d{8})$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid Kenyan phone number.';
    if (form.message.trim().length < 10) e.message = 'Tell us a bit more (at least 10 characters).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Backend will: POST /api/contact with rate limiting and spam protection.
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  return (
    <>
      <PublicNav />

      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="section-head">
            <Badge tone="primary">Contact</Badge>
            <h1 className="section-title">Talk to the Sokoni team</h1>
            <p className="section-sub">
              Whether you are evaluating Sokoni, need help with your account or want
              to explore a partnership — we respond within one business day.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="contact-grid">
            <div className="stack gap-16">
              <Card padding="lg">
                <div className="stack gap-20">
                  <ContactRow
                    icon={Mail}
                    label="Email"
                    value="hello@sokoni.co.ke"
                    hint="For general enquiries"
                  />
                  <ContactRow
                    icon={Phone}
                    label="Phone"
                    value="+254 700 123 456"
                    hint="Mon–Fri · 8:00–18:00 EAT"
                  />
                  <ContactRow
                    icon={MessageSquare}
                    label="Support"
                    value="support@sokoni.co.ke"
                    hint="Existing customers"
                  />
                  <ContactRow
                    icon={MapPin}
                    label="Office"
                    value="Westlands, Nairobi"
                    hint="By appointment only"
                  />
                </div>
              </Card>

              <Card padding="lg">
                <div className="row gap-12" style={{ marginBottom: 10 }}>
                  <span className="feature-icon" style={{ margin: 0 }}><Building2 size={18} /></span>
                  <div>
                    <div className="bold" style={{ fontSize: 14 }}>For enterprise</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      Multi-branch retailers and franchises
                    </div>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.65 }}>
                  Running more than 5 branches? We offer dedicated onboarding,
                  custom reporting and volume pricing. Email us and we will schedule
                  a call.
                </p>
              </Card>
            </div>

            <Card padding="lg">
              {sent ? (
                <div className="stack gap-12" style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div className="sent-icon"><Send size={22} /></div>
                  <h3 style={{ fontSize: 18 }}>Message sent</h3>
                  <p className="muted" style={{ fontSize: 13.5, maxWidth: 340, margin: '0 auto' }}>
                    Thanks, {form.name.split(' ')[0] || 'there'}. Our team will reply to{' '}
                    <strong>{form.email}</strong> within one business day.
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', phone: '', topic: TOPICS[0], message: '' });
                  }}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="stack gap-16" noValidate>
                  <div className="grid-2">
                    <Input
                      label="Full name" value={form.name}
                      onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Wanjiku Kamau"
                      error={errors.name}
                    />
                    <Input
                      label="Email" type="email" value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="you@example.com"
                      error={errors.email}
                    />
                  </div>
                  <div className="grid-2">
                    <Input
                      label="Phone (optional)" value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="0712 345 678"
                      error={errors.phone}
                    />
                    <div className="field">
                      <label className="field-label">Topic</label>
                      <div className="field-control">
                        <select
                          className="field-input"
                          value={form.topic}
                          onChange={e => set('topic', e.target.value)}
                        >
                          {TOPICS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Message</label>
                    <div className="field-control" style={{ padding: 0 }}>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={e => set('message', e.target.value)}
                        placeholder="Tell us about your shop and what you need help with…"
                        style={{
                          width: '100%', border: 0, background: 'transparent',
                          padding: '12px 14px', fontSize: 14, outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit', color: 'var(--text)',
                        }}
                      />
                    </div>
                    {errors.message && (
                      <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>
                        {errors.message}
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit" full size="lg"
                    loading={loading}
                    rightIcon={<Send size={14} />}
                  >
                    Send message
                  </Button>
                  <p className="muted" style={{ fontSize: 11.5, margin: 0, textAlign: 'center' }}>
                    We only use your details to reply to this enquiry.
                  </p>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .contact-grid {
          display: grid; grid-template-columns: 1fr 1.15fr; gap: 24px;
        }
        @media (max-width: 900px) { .contact-grid { grid-template-columns: 1fr; } }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
        .sent-icon {
          width: 56px; height: 56px; border-radius: 18px; margin: 0 auto;
          background: var(--success-bg); color: var(--success);
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </>
  );
}

function ContactRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="row gap-14" style={{ alignItems: 'flex-start' }}>
      <span className="contact-icon"><Icon size={16} /></span>
      <div>
        <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{hint}</div>
      </div>
      <style>{`
        .contact-icon {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </div>
  );
}