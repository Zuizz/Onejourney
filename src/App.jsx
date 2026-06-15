import { useState, createContext, useContext } from 'react';
import HomeScreen from './components/HomeScreen';
import JourneyResults from './components/JourneyResults';
import CommuteDNA from './components/CommuteDNA';
import ActiveJourney from './components/ActiveJourney';
import BookingConfirmation from './components/BookingConfirmation';
import CityDashboard from './components/CityDashboard';
import RailRadarScreen from './components/RailRadarScreen';
import './index.css';

// ─── Shared Journey Context ───
export const JourneyContext = createContext(null);

export function useJourney() {
  return useContext(JourneyContext);
}

const screens = [
  { id: 'home', label: 'Home' },
  { id: 'results', label: 'Results' },
  { id: 'dna', label: 'Commute DNA' },
  { id: 'active', label: 'Live Trip' },
  { id: 'booking', label: 'Booking' },
  { id: 'railradar', label: '🛰️ Rail Radar' },
  { id: 'dashboard', label: '🏙️ Dashboard' },
];

function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [booking, setBooking] = useState(null);
  const [searchParams, setSearchParams] = useState({ from: '', to: '', modes: [] });
  const [excludedModes, setExcludedModes] = useState([]);
  const [loading, setLoading] = useState(false);

  const isDashboard = activeScreen === 'dashboard';
  const navigate = (screen) => setActiveScreen(screen);

  const contextValue = {
    routes, setRoutes,
    selectedRoute, setSelectedRoute,
    booking, setBooking,
    searchParams, setSearchParams,
    excludedModes, setExcludedModes,
    loading, setLoading,
    navigate,
    activeScreen,
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
      <div className={`phone-frame ${isDashboard ? 'dashboard-mode' : ''}`}>
        {/* Top Navigation */}
        <nav className="top-nav">
          {screens.map(s => (
            <button
              key={s.id}
              className={`top-nav-btn ${activeScreen === s.id ? 'active' : ''}`}
              onClick={() => setActiveScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Loading bar */}
        {loading && (
          <div style={{
            height: 3, background: 'linear-gradient(90deg, var(--indigo-400), var(--indigo-600))',
            animation: 'pulse 1s ease infinite', width: '100%',
          }} />
        )}

        {/* Active Screen */}
        <div className="screen" key={activeScreen}>
          {renderScreen()}
        </div>
      </div>
    </JourneyContext.Provider>
  );
}

export default App;
