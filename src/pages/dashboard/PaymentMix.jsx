import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function PaymentMix({ data }) {
  return (
    <div className="row gap-24" style={{ alignItems: 'center' }}>
      <div style={{ width: 180, height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius={54} outerRadius={82} paddingAngle={3}
            >
              {data.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={v => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="stack gap-12" style={{ flex: 1 }}>
        {data.map(d => (
          <div key={d.name} className="row between">
            <span className="row gap-8">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
              <span style={{ fontSize: 13 }}>{d.name}</span>
            </span>
            <span className="mono bold">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}