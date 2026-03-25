'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  data: { month: string; amount: number }[]
}

export function RevenueChart({ data }: Props) {
  if (data.every(d => d.amount === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Még nincs számlázási adat a megjelenítéshez.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)}
        />
        <Tooltip
          formatter={(v) => [typeof v === 'number' ? `${v.toLocaleString('hu-HU')} Ft` : '', 'Bevétel']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
