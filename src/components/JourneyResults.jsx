import { useState } from 'react';

import { useJourney } from '../App';

import {

  Zap, IndianRupee, Shield, Sprout, Smile,

  ArrowRight, ChevronDown, Info, Loader,
  Wallet, Leaf, ShieldCheck, Star, Search

} from 'lucide-react';



const ICON = { size: 16, strokeWidth: 1.5, color: '#6B7280' };



const priorities = [

  { id: 'fastest', label: 'Fastest', icon: Zap, sort: (a, b) => a.durationMin - b.durationMin },

  { id: 'safest', label: 'Safest', icon: Shield, sort: (a, b) => b.safetyVal - a.safetyVal },

  { id: 'greenest', label: 'Greenest', icon: Sprout, sort: (a, b) => a.co2Val - b.co2Val },

  { id: 'comfort', label: 'Comfort', icon: Smile, sort: (a, b) => b.comfort - a.comfort },

];



const routeMetrics = [

  { label: 'Cost',   key: 'cost',   icon: Wallet     },

  { label: 'CO₂',   key: 'co2',    icon: Leaf        },

  { label: 'Safety', key: 'safety', icon: ShieldCheck },

];



export default function JourneyResults() {

  const { routes, setRoutes, setBooking, setSelectedRoute, navigate, searchParams, excludedModes, setLoading, loading, showToast } = useJourney();

  const [activePriority, setActivePriority] = useState('fastest');

  const [commuteDNA, setCommuteDNA] = useState(false);

  const [expandedRoute, setExpandedRoute] = useState(null);

  const [bookingRouteId, setBookingRouteId] = useState(null);

  const [aiInsight, setAiInsight] = useState(null); // { text, disclaimer, distanceKm }

  const [aiLoading, setAiLoading] = useState(false);



  // Sort routes by active priority

  const prioConfig = priorities.find(p => p.id === activePriority);

  const sortedRoutes = [...routes].sort(prioConfig?.sort || (() => 0));

  // If commute DNA is on, the routes come pre-ranked from backend

  const displayRoutes = commuteDNA ? routes : sortedRoutes;



  const handleDNAToggle = async () => {

    const next = !commuteDNA;
    setCommuteDNA(next);

    if (!next) {
      setAiInsight(null);
      // Restore original routes
      try {
        const res = await fetch('/api/routes/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchParams),
        });
        const data = await res.json();
        setRoutes(data.routes);
      } catch (err) { console.error(err); }
      return;
    }

    if (routes.length === 0) {
      showToast('Search for routes first to apply AI DNA ranking', 'warning');
      setCommuteDNA(false);
      return;
    }

    setAiLoading(true);
    showToast('🤖 AI is analysing your routes...', 'info');

    try {
      const token = localStorage.getItem('oj_token');
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          from: searchParams?.from || '',
          to: searchParams?.to || '',
          routes,
        }),
      });

      const data = await res.json();

      if (data.ok && data.aiResult) {
        const { rankedRouteIds, fareEstimates, topInsight, disclaimer, distanceKm } = data.aiResult;

        // Re-order routes by AI ranking
        let reranked = routes.slice();
        if (Array.isArray(rankedRouteIds) && rankedRouteIds.length > 0) {
          reranked = rankedRouteIds
            .map(id => routes.find(r => r.id === id))
            .filter(Boolean);
          // Append any routes AI didn't mention
          routes.forEach(r => { if (!reranked.find(rr => rr.id === r.id)) reranked.push(r); });
        }

        // Inject AI-estimated fares into route objects
        if (fareEstimates) {
          reranked = reranked.map((r, i) => {
            const est = fareEstimates[r.id];
            if (est && est.cost) {
              return {
                ...r,
                cost: est.cost,
                costVal: est.costVal || r.costVal,
                recommended: i === 0,
                insight: i === 0 ? (topInsight || r.insight) : r.insight,
              };
            }
            return { ...r, recommended: i === 0 };
          });
        } else {
          reranked = reranked.map((r, i) => ({
            ...r,
            recommended: i === 0,
            insight: i === 0 ? (topInsight || r.insight) : r.insight,
          }));
        }

        setRoutes(reranked);
        setAiInsight({ text: topInsight, disclaimer, distanceKm });
        showToast('✨ AI Commute DNA ranking applied!', 'success');
      } else {
        showToast('AI analysis failed, showing default ranking', 'warning');
        setCommuteDNA(false);
      }
    } catch (err) {
      console.error('AI DNA error:', err);
      showToast('AI unavailable, showing default ranking', 'warning');
      setCommuteDNA(false);
    } finally {
      setAiLoading(false);
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

      if (!res.ok) throw new Error('Booking failed');

      const data = await res.json();

      setBooking(data);

      setSelectedRoute(routes.find(r => r.id === routeId) || null);

      showToast('Booking confirmed!', 'success');

      navigate('booking');

    } catch (err) {

      console.error('Booking failed:', err);

      showToast('Booking failed. Try again.', 'warning');

    } finally {

      setLoading(false);

      setBookingRouteId(null);

    }

  };



  if (routes.length === 0) {

    return (

      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>

        <Search size={32} strokeWidth={1.5} style={{ color: '#6B7280' }} />

        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No routes loaded</p>

        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>

          Search for a route from the Home screen first

        </p>

        <button className="btn btn-primary" onClick={() => navigate('home')}>

          Go to home

        </button>

      </div>

    );

  }



  return (

    <div className="screen-pad flex flex-col gap-16 animate-fade-in">

      {/* Route header */}

      <div>

        <p className="text-xs text-muted">{searchParams.from} → {searchParams.to}</p>

        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 4, color: '#111827' }}>{displayRoutes.length} routes found</h2>

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

                padding: '7px 14px', borderRadius: 'var(--radius-sm)',

                border: `1px solid ${isActive ? '#4F46E5' : '#E5E7EB'}`,

                background: isActive ? '#EEF2FF' : '#fff',

                color: isActive ? '#4F46E5' : '#6B7280',

                fontSize: '0.72rem', fontWeight: 600,

                cursor: 'pointer', transition: 'all 0.2s',

                flexShrink: 0, fontFamily: 'Inter',

              }}

            >

              <Icon size={14} strokeWidth={1.5} />

              {p.label}

            </button>

          );

        })}

      </div>



      {/* Commute DNA Toggle */}

      <div style={{
        background: commuteDNA ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : '#F9FAFB',
        padding: '12px 16px', borderRadius: 'var(--radius-md)',
        border: commuteDNA ? 'none' : '1px solid #E5E7EB',
        transition: 'all 0.3s',
      }}>

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-8">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: commuteDNA ? '#fff' : '#111827' }}>
              🤖 AI Commute DNA
            </span>
            {aiLoading && (
              <span style={{ fontSize: '0.65rem', color: '#c7d2fe', fontWeight: 500 }}>analysing…</span>
            )}
          </div>

          <div
            className={`toggle ${commuteDNA ? 'on' : ''}`}
            onClick={!aiLoading ? handleDNAToggle : undefined}
            style={{ opacity: aiLoading ? 0.6 : 1, cursor: aiLoading ? 'not-allowed' : 'pointer' }}
          >
            <div className="toggle-knob" />
          </div>

        </div>

        {/* AI Insight Banner */}
        {commuteDNA && aiInsight && !aiLoading && (
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 10 }}>
            <p style={{ fontSize: '0.72rem', color: '#e0e7ff', fontWeight: 500, lineHeight: 1.5 }}>
              ✨ {aiInsight.text}
            </p>
            {aiInsight.distanceKm && (
              <p style={{ fontSize: '0.65rem', color: '#a5b4fc', marginTop: 4 }}>
                Estimated distance: ~{aiInsight.distanceKm} km
              </p>
            )}
            {aiInsight.disclaimer && (
              <p style={{ fontSize: '0.62rem', color: '#a5b4fc', marginTop: 2, fontStyle: 'italic' }}>
                {aiInsight.disclaimer}
              </p>
            )}
          </div>
        )}

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

                ? '1.5px solid #4F46E5'

                : '1px solid #E5E7EB',

              position: 'relative',

              overflow: 'visible',

              boxShadow: route.recommended ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',

            }}

          >

            {/* Best For You Badge */}

            {route.recommended && (

              <div style={{

                position: 'absolute', top: -10, left: 16,

                background: '#4F46E5',

                color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-sm)',

                fontSize: '0.65rem', fontWeight: 600,

                display: 'flex', alignItems: 'center', gap: 4,

              }}>

                <Star size={10} strokeWidth={1.5} fill="#fff" />

                Best for you

              </div>

            )}



            <div className="flex items-start justify-between" style={{ marginTop: route.recommended ? 8 : 0, gap: 12 }}>

              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#111827', flex: 1 }}>{route.title}</h3>

              <span style={{ fontSize: '22px', fontWeight: 700, color: '#4F46E5', flexShrink: 0, lineHeight: 1.1 }}>{route.duration}</span>

            </div>

            {/* Departure / Arrival time strip — shown for CSV bus routes */}
            {route.departureTime && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                background: '#EEF2FF', borderRadius: '8px', padding: '6px 12px',
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4F46E5' }}>DEP</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e1b4b' }}>{route.departureTime}</span>
                <span style={{ margin: '0 6px', color: '#a5b4fc', fontWeight: 700 }}>→</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>ARR</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#064e3b' }}>{route.arrivalTime}</span>
                {route.travelDate && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#6366f1', fontWeight: 600 }}>
                    {new Date(route.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            )}

            {/* Metrics Grid — Cost only shown for train routes */}

            {(() => {
              const visibleMetrics = routeMetrics.filter(m => m.key !== 'cost' || route.cost);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleMetrics.length}, 1fr)`, gap: 8, marginTop: 12 }}>

                  {visibleMetrics.map(m => {

                    const MetricIcon = m.icon;

                    return (

                      <div key={m.label} className="metric-chip">

                        <div className="metric-label">

                          <MetricIcon {...ICON} />

                          {m.label}

                        </div>

                        <p className="metric-value">{route[m.key]}</p>

                      </div>

                    );

                  })}

                </div>
              );
            })()}



            {/* Insight — subtle grey line only */}

            {route.recommended ? (

              <div className="flex items-center gap-8 mt-12" style={{ padding: '0 2px' }}>

                <Info size={14} strokeWidth={1.5} style={{ color: '#6B7280', flexShrink: 0 }} />

                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280' }}>

                  Best match for your profile

                </span>

              </div>

            ) : route.insight && (

              <div className="flex items-center gap-8 mt-12" style={{ padding: '0 2px' }}>

                <Info size={14} strokeWidth={1.5} style={{ color: '#6B7280', flexShrink: 0 }} />

                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280' }}>

                  {route.insight}

                </span>

              </div>

            )}



            {/* Steps Expand */}

            <button

              onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}

              style={{

                display: 'flex', alignItems: 'center', gap: 4,

                marginTop: 10, border: 'none', background: 'none',

                color: '#4F46E5', fontSize: '0.72rem',

                fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',

              }}

            >

              Route details <ChevronDown size={13} strokeWidth={1.5} style={{

                transform: expandedRoute === route.id ? 'rotate(180deg)' : 'none',

                transition: 'transform 0.2s',

              }} />

            </button>

            {expandedRoute === route.id && (

              <div className="animate-fade-in" style={{ marginTop: 8 }}>

                {route.steps.map((step, si) => (

                  <div key={si} className="flex items-center gap-8" style={{ padding: '4px 0' }}>

                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5' }} />

                    <span className="text-xs" style={{ color: '#6B7280' }}>{step}</span>

                  </div>

                ))}

              </div>

            )}



            {/* Book CTA — available on every route */}

            <button

              className={`btn w-full mt-12 ${route.recommended ? 'btn-primary' : ''}`}

              style={route.recommended ? {} : {

                background: '#F9FAFB', color: '#111827', border: '1px solid #E5E7EB',

              }}

              onClick={() => handleBook(route.id)}

              disabled={loading && bookingRouteId === route.id}

            >

              {loading && bookingRouteId === route.id

                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Booking...</>

                : <>Book journey <ArrowRight size={16} strokeWidth={1.5} /></>

              }

            </button>

          </div>

        ))}

      </div>



      {/* Excluded Modes Footnote */}

      {excludedModes.length > 0 && (

        <div className="flex items-center gap-8" style={{

          background: '#F9FAFB', padding: '10px 14px',

          borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #E5E7EB',

        }}>

          <Info size={14} strokeWidth={1.5} style={{ color: '#6B7280', flexShrink: 0 }} />

          <p style={{ fontSize: '0.7rem', color: '#6B7280' }}>

            {excludedModes.join(', ')} routes excluded based on your mode preferences.{' '}

            <span

              style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: 600 }}

              onClick={() => navigate('home')}

            >Change preferences</span>

          </p>

        </div>

      )}

    </div>

  );

}


