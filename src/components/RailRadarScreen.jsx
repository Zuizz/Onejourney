import { useState } from 'react';
import { Map, Search, ArrowLeftRight, HelpCircle, ExternalLink, RefreshCw, Satellite } from 'lucide-react';

const TABS = [
  { id: 'map', label: 'Live Map', url: 'https://railradar.in/railradar', icon: Map, color: 'var(--indigo-600)' },
  { id: 'status', label: 'Search Status', url: 'https://railradar.in/', icon: Search, color: 'var(--amber-600)' },
  { id: 'between', label: 'Between Stations', url: 'https://railradar.in/between', icon: ArrowLeftRight, color: 'var(--green-600)' }
];

export default function RailRadarScreen() {
  const [activeTab, setActiveTab] = useState('map');
  const [key, setKey] = useState(0); // For reloading iframe

  const selectedTab = TABS.find(t => t.id === activeTab) || TABS[0];

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="screen-pad flex flex-col gap-16 animate-fade-in" style={{ height: '100%', padding: '16px 12px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Satellite size={18} strokeWidth={1.5} style={{ color: '#6B7280' }} />
            Indian railways radar
          </h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>Real-time GPS tracking & live status via RailRadar</p>
        </div>
        <div className="flex gap-8">
          <button
            onClick={handleRefresh}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--slate-50)', border: '1px solid var(--slate-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--slate-600)', transition: 'all 0.2s'
            }}
            title="Refresh Map"
          >
            <RefreshCw size={14} />
          </button>
          <a
            href={selectedTab.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--indigo-600)', transition: 'all 0.2s'
            }}
            title="Open in new window"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8" style={{ background: 'var(--slate-50)', padding: 4, borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-100)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 4px', borderRadius: 'var(--radius-md)', border: 'none',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? 'var(--slate-800)' : 'var(--slate-500)',
                fontSize: '0.72rem', fontWeight: isActive ? 700 : 500,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter'
              }}
            >
              <Icon size={13} style={{ color: isActive ? tab.color : 'var(--slate-400)' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Info Warning Banner */}
      <div style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'flex-start', gap: 8
      }}>
        <HelpCircle size={15} strokeWidth={1.5} style={{ color: '#6B7280', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: '0.68rem', color: '#6B7280', lineHeight: 1.4, margin: 0 }}>
          This visualizer uses crowd-powered GPS telemetry. Search a train number inside the frame, or view active trains directly on the map.
        </p>
      </div>

      {/* Iframe Viewport Container */}
      <div className="card" style={{
        flex: 1, padding: 0, overflow: 'hidden', position: 'relative',
        border: '1px solid #E5E7EB', borderRadius: 'var(--radius-md)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', minHeight: 450, display: 'flex'
      }}>
        <iframe
          key={`${selectedTab.id}-${key}`}
          src={selectedTab.url}
          title="RailRadar Live Enquiries"
          style={{
            width: '100%', height: '100%', border: 'none',
            flexGrow: 1, background: '#fff'
          }}
          allow="geolocation"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        />
      </div>
    </div>
  );
}
