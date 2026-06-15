import { useState, createContext, useContext, useEffect, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import JourneyResults from './components/JourneyResults';
import CommuteDNA from './components/CommuteDNA';
import ActiveJourney from './components/ActiveJourney';
import BookingConfirmation from './components/BookingConfirmation';
import CityDashboard from './components/CityDashboard';
import RailRadarScreen from './components/RailRadarScreen';
import './index.css';

export const JourneyContext = createContext(null);
export const ToastContext = createContext(null);

export function useJourney() {
  return useContext(JourneyContext);
}

export function useToast() {
  return useContext(ToastContext);
}

const screens = [
  { id: 'home', label: 'Home' },
  { id: 'results', label: 'Results' },
  { id: 'dna', label: 'Commute DNA' },
  { id: 'active', label: 'Live trip' },
  { id: 'booking', label: 'Booking' },
  { id: 'railradar', label: 'Rail radar' },
  { id: 'dashboard', label: 'Dashboard' },
];

const validScreens = screens.map(s => s.id);

function parseHash() {
  const raw = window.location.hash.slice(1);
  const [screen] = raw.split('?');
  return validScreens.includes(screen) ? screen : 'home';
}

function App() {
  const [activeScreen, setActiveScreen] = useState(parseHash);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [booking, setBooking] = useState(null);
  const [searchParams, setSearchParams] = useState({ from: '', to: '', modes: [] });
  const [excludedModes, setExcludedModes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const navigate = useCallback((screen) => {
    if (screen === 'results' && routes.length === 0) {
      showToast('Search for a route first', 'warning');
      screen = 'home';
    }
    if (screen === 'booking' && !booking) {
      showToast('Book a route first', 'warning');
      screen = 'home';
    }
    if (screen === 'active' && !booking) {
      showToast('Book a route to start live tracking', 'warning');
      screen = 'home';
    }

    setActiveScreen(screen);
    window.location.hash = screen;
  }, [routes.length, booking, showToast]);

  useEffect(() => {
    const onHashChange = () => setActiveScreen(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (activeScreen === 'booking' || activeScreen === 'active') {
      fetch('/api/booking')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBooking(data); })
        .catch(() => {});
    }
  }, [activeScreen]);

  const isDashboard = activeScreen === 'dashboard';

  const contextValue = {
    routes, setRoutes,
    selectedRoute, setSelectedRoute,
    booking, setBooking,
    searchParams, setSearchParams,
    excludedModes, setExcludedModes,
    loading, setLoading,
    navigate,
    activeScreen,
    showToast,
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home': return <HomeScreen />;
      case 'results': return <JourneyResults />;
      case 'dna': return <CommuteDNA />;
      case 'active': return <ActiveJourney />;
      case 'booking': return <BookingConfirmation />;
      case 'railradar': return <RailRadarScreen />;
      case 'dashboard': return <CityDashboard />;
      default: return <HomeScreen />;
    }
  };

  return (
    <JourneyContext.Provider value={contextValue}>
      <ToastContext.Provider value={showToast}>
        <div className={`phone-frame ${isDashboard ? 'dashboard-mode' : ''}`}>
          <nav className="top-nav">
            {screens.map(s => (
              <button
                key={s.id}
                className={`top-nav-btn ${activeScreen === s.id ? 'active' : ''}`}
                onClick={() => navigate(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {loading && (
            <div style={{
              height: 3, background: '#4F46E5',
              animation: 'pulse 1s ease infinite', width: '100%',
            }} />
          )}

          {toast && (
            <div style={{
              position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, padding: '10px 18px', borderRadius: 'var(--radius-full)',
              background: toast.type === 'warning' ? 'var(--amber-500)' : toast.type === 'success' ? 'var(--green-500)' : 'var(--indigo-600)',
              color: '#fff', fontSize: '0.78rem', fontWeight: 600,
              boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease',
              maxWidth: '90%', textAlign: 'center',
            }}>
              {toast.message}
            </div>
          )}

          <div className="screen" key={activeScreen}>
            {renderScreen()}
          </div>
        </div>
      </ToastContext.Provider>
    </JourneyContext.Provider>
  );
}

export default App;
