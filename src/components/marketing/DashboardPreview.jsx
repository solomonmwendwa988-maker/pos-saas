// DashboardPreview.jsx
import { ArrowUpRight, BarChart3, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import './DashboardPreview.css';

export default function DashboardPreview() {
  return (
    <div className="dp">
      <div className="dp-window">
        <div className="dp-bar">
          <span className="dot" style={{ background: '#f87171' }} />
          <span className="dot" style={{ background: '#fbbf24' }} />
          <span className="dot" style={{ background: '#34d399' }} />
          <span className="dp-url">app.sokoni.co.ke/dashboard</span>
        </div>
        <div className="dp-body">
          <aside className="dp-side">
            {['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Reports'].map((t, i) => (
              <div key={t} className={`dp-nav ${i === 0 ? 'on' : ''}`}>{t}</div>
            ))}
          </aside>

          <div className="dp-main">
            <div className="dp-kpis">
              <div className="dp-kpi">
                <span className="dp-kpi-l"><TrendingUp size={11} /> Revenue</span>
                <span className="dp-kpi-v">KSh 184,300</span>
                <span className="dp-kpi-d up">+12.4%</span>
              </div>
              <div className="dp-kpi">
                <span className="dp-kpi-l"><ShoppingCart size={11} /> Orders</span>
                <span className="dp-kpi-v">312</span>
                <span className="dp-kpi-d up">+8.1%</span>
              </div>
              <div className="dp-kpi">
                <span className="dp-kpi-l"><Users size={11} /> Customers</span>
                <span className="dp-kpi-v">1,204</span>
                <span className="dp-kpi-d up">+3.2%</span>
              </div>
            </div>

            <div className="dp-chart">
              <div className="dp-chart-head">
                <span><BarChart3 size={11} /> Sales this week</span>
                <span className="dp-chip">7 days</span>
              </div>
              <svg viewBox="0 0 320 90" className="dp-svg" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d5efc" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6d5efc" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,70 C40,50 60,58 90,40 C120,22 150,36 180,28 C210,20 250,34 320,18 L320,90 L0,90 Z"
                  fill="url(#dpg)"
                />
                <path
                  d="M0,70 C40,50 60,58 90,40 C120,22 150,36 180,28 C210,20 250,34 320,18"
                  fill="none" stroke="#6d5efc" strokeWidth="2"
                />
              </svg>
            </div>

            <div className="dp-list">
              {[
                ['Milk 500ml', 'KSh 65', '×24'],
                ['Cooking Oil 2L', 'KSh 480', '×6'],
                ['Sugar 1kg', 'KSh 175', '×18'],
              ].map(([n, p, q]) => (
                <div key={n} className="dp-row">
                  <span>{n}</span>
                  <span className="dp-q">{q}</span>
                  <span className="dp-p mono">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dp-badge dp-badge-a">
        <ArrowUpRight size={12} />
        <span>+24% sales</span>
      </div>
      <div className="dp-badge dp-badge-b">
        <span className="dp-live" />
        <span>M-Pesa received</span>
      </div>
    </div>
  );
}