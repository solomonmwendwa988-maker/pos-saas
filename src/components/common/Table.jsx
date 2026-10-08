// Table.jsx
import './Table.css';

export default function Table({ columns, rows, empty = 'No records', onRowClick }) {
  if (!rows?.length) {
    return <div className="table-empty">{empty}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align || 'left' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id ?? i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map(c => (
                <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}