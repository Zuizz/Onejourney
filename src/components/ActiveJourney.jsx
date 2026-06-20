import { useState, useEffect, useRef } from 'react';
import { useJourney } from '../App';
import {
  AlertTriangle, X, Navigation, MapPin, Clock,
  Shield, Phone, Users, Locate, Siren, Loader
} from 'lucide-react';
import { shareTicket } from '../utils/journeyActions';

export default function ActiveJourney() {
  const { booking, setBooking, navigate, showToast, token } = useJourney();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [position, setPosition] = useState({ lat: 0, lng: 0, progress: 0 });
  const [eta, setEta] = useState('—');
  const [nextStop, setNextStop] = useState('—');
  const [stopsLeft, setStopsLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [womenFriendly, setWomenFriendly] = useState(false);
  const [safeZone, setSafeZone] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sseKey, setSseKey] = useState(0);
  const eventSourceRef = useRef(null);

  const route = booking?.route;
  const waypoints = route?.waypoints || [];

  useEffect(() => {
    fetch('/api/journey/safety')
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (prefs) {
          setShareLocation(prefs.shareLocation);
          setWomenFriendly(prefs.womenFriendly);
          setSafeZone(prefs.safeZone);
        }
      })
      .catch(() => {});
  }, []);

  const updateSafetyPref = async (key, value) => {
    const updates = { shareLocation, womenFriendly, safeZone, [key]: value };
    if (key === 'shareLocation') setShareLocation(value);
    if (key === 'womenFriendly') setWomenFriendly(value);
    if (key === 'safeZone') setSafeZone(value);

    try {
      await fetch('/api/journey/safety', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch { /* ignore */ }

    if (key === 'shareLocation' && value && booking) {
      try {
        await shareTicket(booking, 'active');
        showToast('Live location shared with contacts', 'success');
      } catch { /* user cancelled share */ }
    }
  };

  useEffect(() => {
    if (!booking || !token) return;

    const es = new EventSource(`/api/journey/live?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.completed) {
          setCompleted(true);
          es.close();
          showToast('Journey complete!', 'success');
          return;
        }
        setPosition({ lat: data.lat, lng: data.lng, progress: data.progress });
        setEta(data.eta);
        setNextStop(data.nextStop);
        setStopsLeft(data.stopsLeft);

        if (data.alert) {
          setAlertMessage(data.alert.message);
          setAlertVisible(true);
        }
      } catch (err) { console.error('SSE parse error:', err); }
    };

    es.onerror = () => setConnected(false);

    return () => { es.close(); };
  }, [booking, sseKey]);

  const handleSwitchRoute = async () => {
    setSwitching(true);
    setAlertVisible(false);
    try {
      const res = await fetch('/api/journey/switch-route', { method: 'POST' });
      if (!res.ok) throw new Error('No alternate route');
      const data = await res.json();
      setBooking(data.booking);
      setCompleted(false);
      setPosition({ lat: 0, lng: 0, progress: 0 });
      setSseKey(k => k + 1);
      showToast(data.message, 'success');
    } catch {
      showToast('No alternate routes available', 'warning');
    } finally {
      setSwitching(false);
    }
  };

  const handleSOS = async () => {
    if (sosActive) return;
    setSosActive(true);
    try {
      const res = await fetch('/api/journey/sos', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, 'success');

      const primary = data.contacts?.[0];
      if (primary && window.confirm(`Call ${primary.name} (${primary.number})?`)) {
        window.location.href = `tel:${primary.number}`;
      }
    } catch {
      showToast('Could not send SOS alert', 'warning');
    } finally {
      setTimeout(() => setSosActive(false), 5000);
    }
  };

  if (!booking) {
    return (
      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>
        <MapPin size={32} strokeWidth={1.5} style={{ color: '#6B7280' }} />
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No active journey</p>
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Book a route first to start live tracking</p>
        <button className="btn btn-primary" onClick={() => navigate('home')}>Go to home</button>
      </div>
    );
  }

  const svgWidth = 358;
  const svgHeight = 240;
  const padding = 40;
  const mapWaypoints = waypoints.length > 0 ? waypoints.map((wp, i) => ({
    name: wp.name,
    x: padding + (i / Math.max(waypoints.length - 1, 1)) * (svgWidth - 2 * padding),
    y: svgHeight / 2 + Math.sin(i * 1.5) * 60,
  })) : [
    { name: route.from, x: 40, y: 200 },
    { name: route.to, x: 320, y: 60 },
  ];

  const progress = position.progress / 100;
  const dotSeg = Math.min(Math.floor(progress * (mapWaypoints.length - 1)), mapWaypoints.length - 2);
  const segProgress = (progress * (mapWaypoints.length - 1)) - dotSeg;
  const wp0 = mapWaypoints[dotSeg] || mapWaypoints[0];
  const wp1 = mapWaypoints[Math.min(dotSeg + 1, mapWaypoints.length - 1)];
  const dotX = wp0.x + (wp1.x - wp0.x) * segProgress;
  const dotY = wp0.y + (wp1.y - wp0.y) * segProgress;

  const pathD = mapWaypoints.length >= 2
    ? `M${mapWaypoints[0].x},${mapWaypoints[0].y} ` + mapWaypoints.slice(1).map((wp, i) => {
        const prev = mapWaypoints[i];
        const cpx = (prev.x + wp.x) / 2;
        return `Q${cpx},${prev.y} ${wp.x},${wp.y}`;
      }).join(' ')
    : `M40,200 L320,60`;

  const statusItems = [
    { icon: Clock, label: 'ETA', value: eta },
    { icon: Navigation, label: 'Next', value: nextStop },
    { icon: MapPin, label: 'Stops left', value: `${stopsLeft}` },
  ];

  const toggleItems = [
    { key: 'shareLocation', label: 'Share live location', desc: 'With emergency contacts', state: shareLocation, icon: Locate },
    { key: 'womenFriendly', label: 'Women-friendly route', desc: 'Prefer well-lit, patrolled paths', state: womenFriendly, icon: Users },
    { key: 'safeZone', label: 'Safe zone alerts', desc: 'Notify near unsafe zones', state: safeZone, icon: Shield },
  ];

  return (
    <div className="flex flex-col animate-fade-in">
      {alertVisible && (
        <div style={{
          background: '#F59E0B',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={18} strokeWidth={1.5} style={{ color: '#fff', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Route alert</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: 3 }}>{alertMessage}</p>
            <div className="flex gap-8 mt-8">
              <button
                onClick={handleSwitchRoute}
                disabled={switching}
                style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  background: '#fff', border: 'none', fontSize: '0.7rem',
                  fontWeight: 700, color: 'var(--amber-700)', cursor: switching ? 'wait' : 'pointer', fontFamily: 'Inter',
                }}
              >
                {switching ? 'Switching...' : 'Switch route'}
              </button>
              <button onClick={() => setAlertVisible(false)} style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: 'rgba(255,255,255,0.25)', border: 'none',
                fontSize: '0.7rem', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'Inter',
              }}>Ignore</button>
            </div>
          </div>
          <button onClick={() => setAlertVisible(false)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 2,
          }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="screen-pad flex flex-col gap-16">
        <div className="flex items-center gap-8">
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--green-500)' : 'var(--red-400)',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span className="text-xs" style={{ fontWeight: 600, color: connected ? 'var(--green-600)' : 'var(--red-500)' }}>
            {completed ? 'Journey complete' : connected ? 'Live tracking active' : 'Connecting...'}
          </span>
          <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{position.progress}%</span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F9FAFB" />
                <stop offset="100%" stopColor="#F3F4F6" />
              </linearGradient>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="#F9FAFB" rx="12" />
            {[40, 80, 120, 160, 200].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2={svgWidth} y2={y} stroke="#c7d2fe" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}
            {[60, 120, 180, 240, 300].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2={svgHeight} stroke="#c7d2fe" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}
            <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round" />
            {mapWaypoints.map((wp, i) => (
              <g key={i}>
                <circle cx={wp.x} cy={wp.y} r="5" fill="#fff" stroke="#4F46E5" strokeWidth="2" />
                <text x={wp.x} y={wp.y + 18} textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="Inter" fontWeight="500">
                  {wp.name}
                </text>
              </g>
            ))}
            <circle cx={dotX} cy={dotY} r="6" fill="#4F46E5">
              <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={dotX} cy={dotY} r="4" fill="#fff" />
          </svg>
        </div>

        <div className="flex gap-8">
          {statusItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="metric-chip" style={{ flex: 1 }}>
                <div className="metric-label">
                  <Icon size={16} strokeWidth={1.5} color="#6B7280" />
                  {item.label}
                </div>
                <p className="metric-value" style={{ fontSize: item.label === 'Next' ? '0.82rem' : undefined }}>{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="flex items-center gap-8 mb-16">
            <Shield size={18} strokeWidth={1.5} style={{ color: '#6B7280' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>Safety panel</h3>
          </div>

          <button
            className="btn btn-danger w-full"
            style={{ padding: '14px', fontSize: '0.95rem', marginBottom: 16 }}
            onClick={handleSOS}
            disabled={sosActive}
          >
            {sosActive ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Siren size={20} />}
            {sosActive ? 'Alert sent' : 'SOS emergency'}
          </button>

          <div className="flex flex-col gap-12">
            {toggleItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: '#F3F4F6', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)' }}>{item.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`toggle ${item.state ? 'on' : ''}`}
                    onClick={() => updateSafetyPref(item.key, !item.state)}
                    role="switch"
                    aria-checked={item.state}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-8 mt-16">
            {[
              { name: 'Ambulance', number: '108' },
              { name: 'Police', number: '100' },
            ].map(c => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="btn w-full"
                style={{
                  background: 'var(--slate-50)', color: 'var(--slate-700)',
                  border: '1px solid var(--slate-200)', textDecoration: 'none',
                  fontSize: '0.75rem', padding: '10px',
                }}
              >
                <Phone size={14} /> {c.name} ({c.number})
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
