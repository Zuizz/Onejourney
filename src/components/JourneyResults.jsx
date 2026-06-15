import { useState } from 'react';
import { useJourney } from '../App';
import {
  Zap, DollarSign, Shield, Leaf, Sofa,
  Clock, ArrowRight, ChevronDown, Sparkles, Info, Loader
} from 'lucide-react';

const priorities = [
  { id: 'fastest', label: 'Fastest', icon: Zap, color: '#f59e0b', sort: (a, b) => a.durationMin - b.durationMin },
  { id: 'cheapest', label: 'Cheapest', icon: DollarSign, color: '#10b981', sort: (a, b) => a.costVal - b.costVal },
  { id: 'safest', label: 'Safest', icon: Shield, color: '#6366f1', sort: (a, b) => b.safetyVal - a.safetyVal },
  { id: 'greenest', label: 'Greenest', icon: Leaf, color: '#22c55e', sort: (a, b) => a.co2Val - b.co2Val },
  { id: 'comfort', label: 'Comfort', icon: Sofa, color: '#8b5cf6', sort: (a, b) => b.comfort - a.comfort },
];

export default function JourneyResults() {
  const { routes, setRoutes, setBooking, navigate, searchParams, excludedModes, setLoading, loading } = useJourney();
  const [activePriority, setActivePriority] = useState('fastest');
  const [commuteDNA, setCommuteDNA] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [bookingRouteId, setBookingRouteId] = useState(null);

  // Sort routes by active priority
  const prioConfig = priorities.find(p => p.id === activePriority);
  const sortedRoutes = [...routes].sort(prioConfig?.sort || (() => 0));
  // If commute DNA is on, the routes come pre-ranked from backend
  const displayRoutes = commuteDNA ? routes : sortedRoutes;

  const handleDNAToggle = async () => {
    const next = !commuteDNA;
    setCommuteDNA(next);
    if (next) {
      // Fetch DNA-ranked routes
      try {
        const res = await fetch('/api/commute-dna');
        const data = await res.json();
        if (data.demoRoutes?.after) {
          setRoutes(data.demoRoutes.after);
        }
      } catch (err) { console.error(err); }
    } else {
      // Re-fetch original routes
      try {
        const res = await fetch('/api/routes/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchParams),
        });
        const data = await res.json();
        setRoutes(data.routes);
      } catch (err) { console.error(err); }
    }
  };

  const handleBook = async (routeId) => {
    setBookingRouteId(routeId);
    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId }),
      });
      const data = await res.json();
      setBooking(data);
      navigate('booking');
    } catch (err) {
      console.error('Booking failed:', err);
    } finally {
      setLoading(false);
      setBookingRouteId(null);
    }
  };

  if (routes.length === 0) {
    return (
      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '2rem' }}>🔍</div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No routes loaded</p>
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>
          Search for a route from the Home screen first
        </p>
        <button className="btn btn-primary" onClick={() => navigate('home')}>
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in">
      {/* Route header */}
      <div>
        <p className="text-xs text-muted">{searchParams.from} → {searchParams.to}</p>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>{displayRoutes.length} routes found</h2>
      </div>

      {/* Priority Pills */}
      <div className="scroll-x">
        {priorities.map(p => {
          const Icon = p.icon;
          const isActive = activePriority === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setActivePriority(p.id); setCommuteDNA(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${isActive ? p.color : 'var(--slate-200)'}`,
                background: isActive ? `${p.color}15` : '#fff',
                color: isActive ? p.color : 'var(--slate-500)',
                fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                flexShrink: 0, fontFamily: 'Inter',
              }}
            >
              <Icon size={13} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Commute DNA Toggle */}
      <div className="flex items-center justify-between" style={{
        background: 'linear-gradient(135deg, var(--indigo-50), #f0f0ff)',
        padding: '12px 14px', borderRadius: 'var(--radius-md)',
      }}>
        <div className="flex items-center gap-8">
          <Sparkles size={16} style={{ color: 'var(--indigo-500)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--indigo-700)' }}>Commute DNA Personalization</span>
        </div>
        <div
          className={`toggle ${commuteDNA ? 'on' : ''}`}
          onClick={handleDNAToggle}
        >
          <div className="toggle-knob" />
        </div>
      </div>

      {/* Route Cards */}
      <div className="flex flex-col gap-12">
        {displayRoutes.map((route, idx) => (
          <div
            key={route.id}
            className="card animate-slide-up"
            style={{
              animationDelay: `${idx * 0.1}s`,
              border: route.recommended
                ? '2px solid var(--indigo-400)'
                : '1px solid var(--slate-100)',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Best For You Badge */}
            {route.recommended && (
              <div style={{
                position: 'absolute', top: -10, left: 16,
                background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-700))',
                color: '#fff', padding: '3px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3px',
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}>
                ⭐ Best for you
              </div>
            )}

            <div className="flex items-center justify-between" style={{ marginTop: route.recommended ? 8 : 0 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{route.title}</h3>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--indigo-600)' }}>{route.duration}</span>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Cost', value: route.cost, icon: '💰' },
                { label: 'CO₂', value: route.co2, icon: '🌱' },
                { label: 'Safety', value: route.safety, icon: '🛡️' },
              ].map(m => (
                <div key={m.label} style={{
                  background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)' }}>{m.icon} {m.label}</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: 2 }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Insight Tag */}
            <div className="flex items-center gap-8 mt-12" style={{
              background: route.recommended ? 'var(--indigo-50)' : 'var(--slate-50)',
              padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            }}>
              <Info size={13} style={{ color: route.recommended ? 'var(--indigo-500)' : 'var(--slate-400)', flexShrink: 0 }} />
              <span style={{
                fontSize: '0.72rem', fontWeight: 500,
                color: route.recommended ? 'var(--indigo-700)' : 'var(--slate-600)'
              }}>
                {route.insight}
              </span>
            </div>

            {route.timeSaved && (
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--green-600)', marginTop: 8 }}>
                ⏱ {route.timeSaved}
              </p>
            )}

            {/* Steps Expand */}
            <button
              onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                marginTop: 10, border: 'none', background: 'none',
                color: 'var(--indigo-500)', fontSize: '0.72rem',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
              }}
            >
              Route details <ChevronDown size={13} style={{
                transform: expandedRoute === route.id ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
            </button>
            {expandedRoute === route.id && (
              <div className="animate-fade-in" style={{ marginTop: 8 }}>
                {route.steps.map((step, si) => (
                  <div key={si} className="flex items-center gap-8" style={{ padding: '4px 0' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo-400)' }} />
                    <span className="text-xs" style={{ color: 'var(--slate-600)' }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Book CTA */}
            {route.recommended && (
              <button
                className="btn btn-primary w-full mt-12"
                onClick={() => handleBook(route.id)}
                disabled={loading && bookingRouteId === route.id}
              >
                {loading && bookingRouteId === route.id
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Booking...</>
                  : <>Book Journey <ArrowRight size={16} /></>
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Excluded Modes Footnote */}
      {excludedModes.length > 0 && (
        <div className="flex items-center gap-8" style={{
          background: 'var(--slate-50)', padding: '10px 14px',
          borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--slate-300)',
        }}>
          <Info size={14} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>
            {excludedModes.join(', ')} routes excluded based on your mode preferences.{' '}
            <span
              style={{ color: 'var(--indigo-500)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('home')}
            >Change preferences</span>
          </p>
        </div>
      )}
    </div>
  );
}
