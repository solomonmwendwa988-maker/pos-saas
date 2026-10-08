import { Check, Minus } from 'lucide-react';
import { FEATURE_MATRIX, PLANS } from '@/config/plans';
import './ComparisonTable.css';

function Cell({ value, isPopular }) {
  if (value === true) return <Check size={16} color="var(--success)" />;
  if (value === false) return <Minus size={16} color="var(--text-faint)" />;
  return <span className={isPopular ? 'comp-value-popular' : ''}>{value}</span>;
}

export default function ComparisonTable() {
  return (
    <div className="comp-wrap">
      <table className="comp">
        <thead>
          <tr>
            <th className="comp-feature">Features</th>
            {PLANS.map(p => (
              <th key={p.id} className={p.popular ? 'comp-popular' : ''}>
                <div className="comp-plan-name">{p.name}</div>
                <div className="comp-plan-price">
                  KSh {p.price.toLocaleString()}<span>/mo</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map(group => (
            <>
              <tr key={`g-${group.group}`} className="comp-group-row">
                <td colSpan={PLANS.length + 1}>{group.group}</td>
              </tr>
              {group.rows.map(row => (
                <tr key={row.label}>
                  <td className="comp-feature">{row.label}</td>
                  {PLANS.map(p => (
                    <td key={p.id} className={p.popular ? 'comp-popular-cell' : ''}>
                      <Cell value={row.values[p.id]} isPopular={p.popular} />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}