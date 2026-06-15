import { useState, useEffect, useRef, useCallback } from 'react';
import { useJourney } from '../App';
import { Brain, Zap, DollarSign, Shield, Smile, Loader } from 'lucide-react';

const sliderConfig = [
  { id: 'cost', label: 'Cost', icon: DollarSign, color: '#10b981' },
  { id: 'safety', label: 'Safety', icon: Shield, color: '#6366f1' },
  { id: 'speed', label: 'Speed', icon: Zap, color: '#f59e0b' },
  { id: 'comfort', label: 'Comfort', icon: Smile, color: '#8b5cf6' },
];

const getLevel = (val) => {
  if (val < 33) return { text: 'Low', color: 'var(--slate-500)' };
  if (val < 66) return { text: 'Medium', color: 'var(--amber-500)' };
  return { text: 'High', color: 'var(--green-600)' };
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
          <Icon size={15} style={{ color: config.color }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{config.label}</span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: level.color,
          background: `${level.color}15`, padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
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
        <div className="slider-fill" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${config.color}88, ${config.color})` }} />
        <div className="slider-thumb" style={{ left: `${value}%`, borderColor: config.color }} />
      </div>
    </div>
  );
}

export default function CommuteDNA() {
  const { routes } = useJourney();
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
        <Loader size={32} style={{ color: 'var(--indigo-500)', animation: 'spin 1s linear infinite' }} />
        <p className="text-sm text-muted">Loading your Commute DNA...</p>
      </div>
    );
  }

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-12">
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--indigo-100), var(--indigo-200))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain size={20} style={{ color: 'var(--indigo-600)' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Commute DNA</h2>
          <p className="text-xs text-muted">Your personalized travel profile</p>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="flex flex-col gap-8">
        {insights.map((card, i) => (
          <div
            key={i}
            className="animate-slide-up"
            style={{
              animationDelay: `${i * 0.08}s`,
              background: card.bg,
              border: `1px solid ${card.color}22`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}
          >
            <div className="flex items-center gap-8 mb-12">
              <span style={{ fontSize: '1.1rem' }}>{card.icon}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: card.color }}>{card.title}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--slate-600)', lineHeight: 1.5 }}>{card.description}</p>
          </div>
        ))}
      </div>

      {/* Sliders */}
      <div className="card card-elevated">
        <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>Adjust Your Priorities</p>
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
      {beforeRoutes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-12">
            <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Personalization Demo</p>
            <div className="flex items-center gap-8">
              <span className="text-xs" style={{ fontWeight: 600, color: showAfter ? 'var(--slate-400)' : 'var(--slate-700)' }}>Before</span>
              <div className={`toggle ${showAfter ? 'on' : ''}`} onClick={() => setShowAfter(!showAfter)}>
                <div className="toggle-knob" />
              </div>
              <span className="text-xs" style={{ fontWeight: 600, color: showAfter ? 'var(--indigo-600)' : 'var(--slate-400)' }}>After</span>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {displayRoutes.map((r, i) => (
              <div
                key={`${showAfter}-${i}`}
                className="card animate-slide-up"
                style={{
                  animationDelay: `${i * 0.08}s`,
                  border: i === 0 && showAfter ? '2px solid var(--indigo-400)' : '1px solid var(--slate-100)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.title}</p>
                    <p className="text-xs text-muted mt-8">{r.duration} • {r.cost}</p>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: i === 0 && showAfter ? 'var(--indigo-50)' : 'var(--slate-50)',
                    color: i === 0 && showAfter ? 'var(--indigo-600)' : 'var(--slate-500)',
                  }}>
                    {i === 0 && showAfter ? 'Best for you ⭐' : r.modes?.join(' + ') || 'Route'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
