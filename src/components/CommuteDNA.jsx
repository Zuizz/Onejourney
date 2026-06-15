import { useState, useEffect, useRef, useCallback } from 'react';
import { useJourney } from '../App';
import { Zap, Wallet, Shield, Smile, Loader, Clock, CloudRain, Star } from 'lucide-react';

const ICON = { size: 16, strokeWidth: 1.5, color: '#6B7280' };

const sliderConfig = [
  { id: 'cost', label: 'Cost', icon: Wallet },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'speed', label: 'Speed', icon: Zap },
  { id: 'comfort', label: 'Comfort', icon: Smile },
];

const insightIconMap = {
  'Peak Hour Patterns': Clock,
  'Safety Conscious': Shield,
  'Monsoon Aware': CloudRain,
};

const getLevel = (val) => {
  if (val < 33) return { text: 'Low', color: '#6B7280' };
  if (val < 66) return { text: 'Medium', color: '#6B7280' };
  return { text: 'High', color: '#059669' };
};

function DragSlider({ config, value, onChange }) {
  const trackRef = useRef(null);
  const level = getLevel(value);

  const handleInteraction = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(Math.round(pct));
  }, [onChange]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleInteraction(e.clientX);
    const onMove = (ev) => handleInteraction(ev.clientX);
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e) => {
    handleInteraction(e.touches[0].clientX);
    const onMove = (ev) => { ev.preventDefault(); handleInteraction(ev.touches[0].clientX); };
    const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const Icon = config.icon;

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-8">
          <Icon {...ICON} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{config.label}</span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 600, color: level.color,
          background: '#F3F4F6', padding: '2px 10px',
          borderRadius: 'var(--radius-sm)',
        }}>
          {level.text}
        </span>
      </div>
      <div
        className="slider-track"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="slider-fill" style={{ width: `${value}%` }} />
        <div className="slider-thumb" style={{ left: `${value}%`, borderColor: '#4F46E5' }} />
      </div>
    </div>
  );
}

export default function CommuteDNA() {
  const { routes, navigate } = useJourney();
  const [sliders, setSliders] = useState({ cost: 50, safety: 50, speed: 50, comfort: 50 });
  const [insights, setInsights] = useState([]);
  const [showAfter, setShowAfter] = useState(false);
  const [beforeRoutes, setBeforeRoutes] = useState([]);
  const [afterRoutes, setAfterRoutes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const debounceRef = useRef(null);

  // Fetch initial DNA data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/commute-dna');
        const data = await res.json();
        setSliders(data.preferences);
        setInsights(data.insights);
        if (data.demoRoutes) {
          setBeforeRoutes(data.demoRoutes.before);
          setAfterRoutes(data.demoRoutes.after);
        }
      } catch (err) { console.error(err); }
      finally { setFetching(false); }
    })();
  }, []);

  useEffect(() => {
    if (routes.length > 0 && beforeRoutes.length === 0) {
      setBeforeRoutes(routes);
      fetch('/api/commute-dna', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: sliders }),
      })
        .then(r => r.json())
        .then(data => { if (data.demoRoutes?.after) setAfterRoutes(data.demoRoutes.after); })
        .catch(() => {});
    }
  }, [routes]);

  const updateSlider = (id, val) => {
    const updated = { ...sliders, [id]: val };
    setSliders(updated);

    // Debounced API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/commute-dna', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: updated }),
        });
        const data = await res.json();
        if (data.demoRoutes) {
          setAfterRoutes(data.demoRoutes.after);
        }
      } catch (err) { console.error(err); }
    }, 300);
  };

  const displayRoutes = showAfter ? afterRoutes : beforeRoutes;

  if (fetching) {
    return (
      <div className="screen-pad flex flex-col gap-16" style={{ alignItems: 'center', paddingTop: 60 }}>
        <Loader size={32} style={{ color: '#4F46E5', animation: 'spin 1s linear infinite' }} />
        <p className="text-sm text-muted">Loading your Commute DNA...</p>
      </div>
    );
  }

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in">
      {/* Header — no icon */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>Commute DNA</h2>
        <p className="text-xs text-muted">Your personalized travel profile</p>
      </div>

      {/* Insight Cards */}
      <div className="flex flex-col gap-8">
        {insights.map((card, i) => {
          const InsightIcon = insightIconMap[card.title] || Clock;
          return (
            <div
              key={i}
              className="card animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-8 mb-12">
                <InsightIcon {...ICON} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{card.title}</span>
              </div>
              <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.5 }}>{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="card">
        <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 16, color: '#111827' }}>Adjust your priorities</p>
        {sliderConfig.map(cfg => (
          <DragSlider
            key={cfg.id}
            config={cfg}
            value={sliders[cfg.id]}
            onChange={(v) => updateSlider(cfg.id, v)}
          />
        ))}
      </div>

      {/* Before/After Demo */}
      {beforeRoutes.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-12">
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>Personalization demo</p>
            <div className="flex items-center gap-8">
              <span className="text-xs" style={{ fontWeight: 600, color: showAfter ? '#6B7280' : '#111827' }}>Before</span>
              <div className={`toggle ${showAfter ? 'on' : ''}`} onClick={() => setShowAfter(!showAfter)}>
                <div className="toggle-knob" />
              </div>
              <span className="text-xs" style={{ fontWeight: 600, color: showAfter ? '#4F46E5' : '#6B7280' }}>After</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {displayRoutes.map((r, i) => (
              <div
                key={`${showAfter}-${r.id ?? i}`}
                className="card animate-slide-up"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  border: i === 0 && showAfter ? '1.5px solid #4F46E5' : '1px solid #E5E7EB',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: '17px', fontWeight: 600, color: '#111827' }}>{r.title}</p>
                    <p className="text-xs text-muted mt-8">{r.duration} • {r.cost}</p>
                  </div>
                  {i === 0 && showAfter ? (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600,
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                      background: '#EEF2FF', color: '#4F46E5',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Star size={10} strokeWidth={1.5} fill="#4F46E5" />
                      Best for you
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600,
                      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                      background: '#F3F4F6', color: '#6B7280',
                    }}>
                      {r.modes?.join(' + ') || 'Route'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#111827' }}>No routes to personalize yet</p>
          <p className="text-xs text-muted mb-16">Search for a journey to see how Commute DNA re-ranks your options</p>
          <button className="btn btn-primary" onClick={() => navigate('home')}>Search a route</button>
        </div>
      )}
    </div>
  );
}
