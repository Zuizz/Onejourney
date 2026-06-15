import { useState, useEffect, useRef } from 'react';
import { useJourney } from '../App';
import {
  AlertTriangle, X, Navigation, MapPin, Clock,
  Shield, Phone, Users, Locate, Siren, Loader
} from 'lucide-react';

export default function ActiveJourney() {
  const { booking, navigate } = useJourney();
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
  const eventSourceRef = useRef(null);

  const route = booking?.route;
  const waypoints = route?.waypoints || [];

  // Connect to SSE live updates
  useEffect(() => {
    if (!booking) return;

    const es = new EventSource('/api/journey/live');
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.completed) {
          setCompleted(true);
          es.close();
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

    es.onerror = () => {
      setConnected(false);
    };

    return () => { es.close(); };
  }, [booking]);

  if (!booking) {
    return (
      <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ alignItems: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '2rem' }}>📍</div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No active journey</p>
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Book a route first to start live tracking</p>
        <button className="btn btn-primary" onClick={() => navigate('home')}>Go to Home</button>
      </div>
    );
  }

  // Map waypoint positions to SVG coordinates
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

  // Interpolate dot position
  const progress = position.progress / 100;
  const dotSeg = Math.min(Math.floor(progress * (mapWaypoints.length - 1)), mapWaypoints.length - 2);
  const segProgress = (progress * (mapWaypoints.length - 1)) - dotSeg;
  const wp0 = mapWaypoints[dotSeg] || mapWaypoints[0];
  const wp1 = mapWaypoints[Math.min(dotSeg + 1, mapWaypoints.length - 1)];
  const dotX = wp0.x + (wp1.x - wp0.x) * segProgress;
  const dotY = wp0.y + (wp1.y - wp0.y) * segProgress;

  // Build SVG path
  const pathD = mapWaypoints.length >= 2
    ? `M${mapWaypoints[0].x},${mapWaypoints[0].y} ` + mapWaypoints.slice(1).map((wp, i) => {
        const prev = mapWaypoints[i];
        const cpx = (prev.x + wp.x) / 2;
        return `Q${cpx},${prev.y} ${wp.x},${wp.y}`;
      }).join(' ')
    : `M40,200 L320,60`;

  const statusItems = [
    { icon: Clock, label: 'ETA', value: eta, color: 'var(--indigo-500)' },
    { icon: Navigation, label: 'Next', value: nextStop, color: 'var(--green-500)' },
    { icon: MapPin, label: 'Stops left', value: `${stopsLeft}`, color: 'var(--amber-500)' },
  ];

  const toggleItems = [
    { label: 'Share live location', desc: 'With emergency contacts', state: shareLocation, setter: setShareLocation, icon: Locate },
    { label: 'Women-friendly route', desc: 'Prefer well-lit, patrolled paths', state: womenFriendly, setter: setWomenFriendly, icon: Users },
    { label: 'Safe zone alerts', desc: 'Notify near unsafe zones', state: safeZone, setter: setSafeZone, icon: Shield },
  ];

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Dismissable Alert Banner */}
      {alertVisible && (
        <div style={{
          background: 'linear-gradient(135deg, var(--amber-400), var(--amber-500))',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={18} style={{ color: '#fff', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Route Alert</p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', marginTop: 3 }}>{alertMessage}</p>
            <div className="flex gap-8 mt-8">
              <button style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: '#fff', border: 'none', fontSize: '0.7rem',
                fontWeight: 700, color: 'var(--amber-700)', cursor: 'pointer', fontFamily: 'Inter',
              }}>Switch Route</button>
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
        {/* Connection indicator */}
        <div className="flex items-center gap-8">
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--green-500)' : 'var(--red-400)',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span className="text-xs" style={{ fontWeight: 600, color: connected ? 'var(--green-600)' : 'var(--red-500)' }}>
            {completed ? 'Journey Complete!' : connected ? 'Live Tracking Active' : 'Connecting...'}
          </span>
          <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{position.progress}%</span>
        </div>

        {/* SVG Route Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f0ff" />
                <stop offset="100%" stopColor="#e0e7ff" />
              </linearGradient>
              <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#mapBg)" rx="12" />

            {/* Grid */}
            {[40,80,120,160,200].map(y => (
              <line key={`h${y}`} x1="0" y1={y} x2={svgWidth} y2={y} stroke="#c7d2fe" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}
            {[60,120,180,240,300].map(x => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2={svgHeight} stroke="#c7d2fe" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}

            {/* Route path */}
            <path d={pathD} fill="none" stroke="url(#routeGrad)" strokeWidth="3.5" strokeLinecap="round" />

            {/* Station dots + labels */}
            {mapWaypoints.map((wp, i) => (
              <g key={i}>
                <circle cx={wp.x} cy={wp.y} r="5" fill="#fff" stroke="#6366f1" strokeWidth="2" />
                <text x={wp.x} y={wp.y + 18} textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="Inter" fontWeight="500">
                  {wp.name}
                </text>
              </g>
            ))}

            {/* Animated position dot */}
            <circle cx={dotX} cy={dotY} r="6" fill="#6366f1">
              <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={dotX} cy={dotY} r="4" fill="#fff" />
          </svg>
        </div>

        {/* Live Status Row */}
        <div className="flex gap-8">
          {statusItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{
                flex: 1, background: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)', padding: '10px 12px', textAlign: 'center',
              }}>
                <Icon size={16} style={{ color: item.color, margin: '0 auto 4px' }} />
                <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)' }}>{item.label}</p>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 2 }}>{item.value}</p>
              </div>
            );
          })}
        </div>

        {/* Safety Panel */}
        <div className="card card-elevated">
          <div className="flex items-center gap-8 mb-16">
            <Shield size={18} style={{ color: 'var(--indigo-500)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Safety Panel</h3>
          </div>

          <button className="btn btn-danger w-full" style={{ padding: '14px', fontSize: '0.95rem', marginBottom: 16 }}>
            <Siren size={20} /> SOS Emergency
          </button>

          <div className="flex flex-col gap-12">
            {toggleItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: 'var(--indigo-50)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} style={{ color: 'var(--indigo-500)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)' }}>{item.desc}</p>
                    </div>
                  </div>
                  <div className={`toggle ${item.state ? 'on' : ''}`} onClick={() => item.setter(!item.state)}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
