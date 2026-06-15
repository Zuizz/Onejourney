import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Clock, Activity, Loader
} from 'lucide-react';

const getHeatColor = (val) => {
  const colors = [
    '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc',
    '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
    '#3730a3', '#312e81', '#1e1b4b'
  ];
  return colors[Math.min(val, 10)];
};

const metricIcons = [Users, TrendingUp, Clock, Activity];

export default function CityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
        <Loader size={32} style={{ color: 'var(--indigo-500)', animation: 'spin 1s linear infinite' }} />
        <p className="text-sm text-muted" style={{ marginTop: 16 }}>Loading dashboard data...</p>
      </div>
    );
  }

  const priorityColors = {
    HIGH: { color: 'var(--red-500)', bg: 'var(--red-50)' },
    MEDIUM: { color: 'var(--amber-500)', bg: 'var(--amber-50)' },
    LOW: { color: 'var(--green-500)', bg: 'var(--green-50)' },
  };

  return (
    <div style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }} className="animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            🏙️ City Dashboard — Mumbai
          </h1>
          <p className="text-sm text-muted mt-8">Real-time multimodal transit intelligence</p>
        </div>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--green-50)', padding: '6px 14px',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--green-200)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-500)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-700)' }}>Live Data</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {data.metrics.map((m, i) => {
          const Icon = metricIcons[i];
          const TrendIcon = m.up ? TrendingUp : TrendingDown;
          const metricColors = ['var(--indigo-500)', 'var(--green-500)', 'var(--amber-500)', 'var(--indigo-400)'];
          const color = metricColors[i];
          return (
            <div key={i} className="card card-elevated animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center justify-between mb-12">
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: `${color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex items-center gap-8" style={{
                  color: m.up ? 'var(--green-600)' : 'var(--red-500)',
                  fontSize: '0.75rem', fontWeight: 600,
                }}>
                  <TrendIcon size={14} />
                  {m.change}
                </div>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>{m.value}</p>
              <p className="text-xs text-muted mt-8">{m.title}</p>
            </div>
          );
        })}
      </div>

      {/* Heatmap + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Demand Heatmap */}
        <div className="card card-elevated">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>📊 Demand Heatmap</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  {data.heatmap.headers.map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 6px', fontWeight: 600,
                      color: 'var(--slate-500)', textAlign: i === 0 ? 'left' : 'center',
                      borderBottom: '1px solid var(--slate-100)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmap.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: ci === 0 ? '6px 8px' : '6px',
                        textAlign: ci === 0 ? 'left' : 'center',
                        fontWeight: ci === 0 ? 600 : 500,
                        color: ci === 0 ? 'var(--slate-700)' : '#fff',
                        background: ci === 0 ? 'transparent' : getHeatColor(cell),
                        borderRadius: ci === 0 ? 0 : 4,
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-8 mt-16">
            <span className="text-xs text-muted">Low</span>
            <div style={{
              flex: 1, height: 8, borderRadius: 4,
              background: 'linear-gradient(90deg, #eef2ff, #6366f1, #1e1b4b)',
            }} />
            <span className="text-xs text-muted">High</span>
          </div>
        </div>

        {/* Modal Shift Chart */}
        <div className="card card-elevated">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>📈 Modal Shift Trends (6 Months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: 'none',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  fontSize: '0.75rem',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
              <Bar dataKey="Mumbai Local" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Metro" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="BEST Bus" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Auto" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights + City Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card card-elevated">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>🎯 Planner Recommendations</h3>
          <div className="flex flex-col gap-12">
            {data.insights.map((ins, i) => {
              const pc = priorityColors[ins.priority] || priorityColors.LOW;
              return (
                <div key={i} className="animate-slide-up" style={{
                  animationDelay: `${i * 0.1}s`,
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${pc.color}30`, background: pc.bg,
                }}>
                  <div className="flex items-center gap-8 mb-12">
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 800,
                      background: `${pc.color}20`, color: pc.color,
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      letterSpacing: '0.5px',
                    }}>{ins.priority}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{ins.title}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>{ins.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-elevated">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>🌆 City at a Glance</h3>
          <div className="flex flex-col gap-12">
            {data.cityStats.map((stat, i) => (
              <div key={i} style={{
                padding: '14px 16px', background: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>{stat.label}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-800)', marginTop: 4 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
