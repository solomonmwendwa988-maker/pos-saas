import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatKSh } from '@/utils/format';

export default function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d5efc" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6d5efc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef0f7" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `${v / 1000}k`}
        />
        <Tooltip
          formatter={v => formatKSh(v)}
          contentStyle={{
            borderRadius: 12, border: '1px solid #e6e8f0',
            boxShadow: '0 6px 20px rgba(15,23,42,0.08)', fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#6d5efc" strokeWidth={2.5} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}