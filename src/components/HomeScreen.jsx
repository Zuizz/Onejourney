import { useState, useEffect, useRef } from 'react';
import { useJourney } from '../App';
import {
  ArrowUpDown, Search, Clock, ChevronRight,
  Train, Bus, Car, Bike, Ship, Loader, User, Route
} from 'lucide-react';

const modeIcons = {
  Local: Train,
  Metro: Train,
  Bus: Bus,
  Auto: Bike,
  Cab: Car,
  Ferry: Ship,
};

export default function HomeScreen() {
  const { setRoutes, setSearchParams, setExcludedModes, navigate, setLoading, loading, showToast } = useJourney();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modes, setModes] = useState(['Local', 'Metro', 'Bus']);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [recentTrips, setRecentTrips] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [userName, setUserName] = useState('ZA');
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('oj_recent_trips') || '[]');
      setRecentTrips(saved.slice(0, 5));

      const profile = JSON.parse(localStorage.getItem('oj_profile') || '{}');
      if (profile.initials) setUserName(profile.initials);
    } catch { setRecentTrips([]); }
  }, []);

  useEffect(() => {
    const loadSuggestion = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem('oj_recent_trips') || '[]');
        const res = await fetch('/api/home/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recentTrips: saved }),
        });
        const data = await res.json();
        setSuggestion(data);
      } catch { /* ignore */ }
    };
    loadSuggestion();
  }, []);

  const fetchStations = async (query, setter, showSetter) => {
    if (query.length < 1) { setter([]); showSetter(false); return; }
    try {
      const res = await fetch(`/api/stations?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setter(data);
      showSetter(data.length > 0);
    } catch { setter([]); }
  };

  const toggleMode = (m) =>
    setModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const swap = () => { setFrom(to); setTo(from); };

  const runSearch = async (searchFrom, searchTo, searchModes = modes) => {
    if (!searchFrom || !searchTo) return;
    setFrom(searchFrom);
    setTo(searchTo);
    setLoading(true);
    try {
      const res = await fetch('/api/routes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: searchFrom, to: searchTo, modes: searchModes }),
      });
      const data = await res.json();
      setRoutes(data.routes);
      setExcludedModes(data.excludedModes || []);
      setSearchParams({ from: searchFrom, to: searchTo, modes: searchModes });

      const trip = {
        from: searchFrom, to: searchTo,
        mode: searchModes.join(' + '),
        time: data.routes[0]?.duration || '—',
        ts: Date.now(),
      };
      const updated = [trip, ...recentTrips.filter(t => !(t.from === searchFrom && t.to === searchTo))].slice(0, 5);
      setRecentTrips(updated);
      localStorage.setItem('oj_recent_trips', JSON.stringify(updated));

      navigate('results');
    } catch (err) {
      console.error('Search failed:', err);
      showToast('Route search failed. Try again.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => runSearch(from, to, modes);

  const handleRecentClick = (trip) => {
    const tripModes = trip.mode ? trip.mode.split(' + ') : modes;
    runSearch(trip.from, trip.to, tripModes);
  };

  const handleSuggestionClick = () => {
    if (!suggestion) return;
    runSearch(suggestion.from, suggestion.to, modes);
  };

  const handleProfileClick = () => {
    const name = prompt('Your name (for profile):', userName === 'ZA' ? '' : userName);
    if (name?.trim()) {
      const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      setUserName(initials);
      localStorage.setItem('oj_profile', JSON.stringify({ name: name.trim(), initials }));
      showToast(`Welcome, ${name.trim()}!`, 'success');
    }
  };

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            OneJourney
          </h1>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>Plan your multimodal commute — Mumbai</p>
        </div>
        <button
          onClick={handleProfileClick}
          title="Edit profile"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#4F46E5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: '0.9rem',
            border: 'none', cursor: 'pointer',
          }}
        >
          {userName.length <= 2 ? userName : <User size={18} />}
        </button>
      </div>

      <div className="card" style={{ position: 'relative' }}>
        <div className="flex flex-col gap-12">
          <div style={{ position: 'relative' }}>
            <div className="flex items-center gap-8">
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--green-500)', boxShadow: '0 0 0 3px var(--green-100)'
              }} />
              <input
                ref={fromRef}
                type="text"
                placeholder="From where?"
                value={from}
                onChange={e => { setFrom(e.target.value); fetchStations(e.target.value, setFromSuggestions, setShowFromDropdown); }}
                onFocus={() => from.length > 0 && fromSuggestions.length > 0 && setShowFromDropdown(true)}
                onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem',
                  fontFamily: 'Inter', color: 'var(--slate-800)',
                  background: 'var(--slate-50)', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
            </div>
            {showFromDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 18, right: 0, zIndex: 10,
                background: '#fff', borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--slate-100)',
                marginTop: 4, maxHeight: 180, overflowY: 'auto',
              }}>
                {fromSuggestions.map(s => (
                  <div
                    key={s.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--slate-50)' }}
                    onMouseDown={() => { setFrom(s.name); setShowFromDropdown(false); }}
                  >
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--slate-400)', marginLeft: 8 }}>{s.zone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--slate-100)', marginLeft: 18 }} />

          <div style={{ position: 'relative' }}>
            <div className="flex items-center gap-8">
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--red-500)', boxShadow: '0 0 0 3px var(--red-50)'
              }} />
              <input
                ref={toRef}
                type="text"
                placeholder="To where?"
                value={to}
                onChange={e => { setTo(e.target.value); fetchStations(e.target.value, setToSuggestions, setShowToDropdown); }}
                onFocus={() => to.length > 0 && toSuggestions.length > 0 && setShowToDropdown(true)}
                onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem',
                  fontFamily: 'Inter', color: 'var(--slate-800)',
                  background: 'var(--slate-50)', padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
            </div>
            {showToDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 18, right: 0, zIndex: 10,
                background: '#fff', borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--slate-100)',
                marginTop: 4, maxHeight: 180, overflowY: 'auto',
              }}>
                {toSuggestions.map(s => (
                  <div
                    key={s.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--slate-50)' }}
                    onMouseDown={() => { setTo(s.name); setShowToDropdown(false); }}
                  >
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--slate-400)', marginLeft: 8 }}>{s.zone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={swap}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--indigo-50)', border: '2px solid var(--indigo-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s', color: 'var(--indigo-600)'
          }}
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      {suggestion && (
        <button
          onClick={handleSuggestionClick}
          disabled={loading}
          style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'transform 0.2s',
            textAlign: 'left', width: '100%',
          }}
        >
          <div className="flex items-center gap-8 mb-12">
            <Route size={16} strokeWidth={1.5} style={{ color: '#6B7280' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personalized for you</span>
          </div>
          <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--slate-700)' }}>
            {suggestion.label}: <strong>{suggestion.from} → {suggestion.to}</strong>
          </p>
          <p className="text-xs text-muted mt-8">{suggestion.modes} • {suggestion.duration}</p>
        </button>
      )}

      <div>
        <p className="text-xs font-semibold text-muted mb-12" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Travel Modes</p>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          {Object.keys(modeIcons).map(m => {
            const Icon = modeIcons[m];
            return (
              <button key={m} className={`chip ${modes.includes(m) ? 'active' : ''}`} onClick={() => toggleMode(m)}>
                <Icon size={14} /> {m}
              </button>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn-primary w-full"
        style={{ padding: '14px', fontSize: '0.95rem' }}
        onClick={handleSearch}
        disabled={loading || !from || !to}
      >
        {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={18} />}
        {loading ? 'Searching...' : 'Find routes'}
      </button>

      {recentTrips.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted mb-12" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Trips</p>
          <div className="flex flex-col gap-8">
            {recentTrips.map((trip, i) => (
              <button
                key={`${trip.from}-${trip.to}-${trip.ts}`}
                className="card animate-slide-up"
                disabled={loading}
                style={{
                  animationDelay: `${i * 0.08}s`,
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'box-shadow 0.2s',
                  border: 'none', textAlign: 'left', width: '100%',
                }}
                onClick={() => handleRecentClick(trip)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      background: 'var(--indigo-50)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: 'var(--indigo-500)'
                    }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{trip.from} → {trip.to}</p>
                      <p className="text-xs text-muted mt-8">{trip.mode} • {trip.time}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--slate-400)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
