import { useState, createContext, useContext, useEffect, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import JourneyResults from './components/JourneyResults';
import CommuteDNA from './components/CommuteDNA';
import ActiveJourney from './components/ActiveJourney';
import BookingConfirmation from './components/BookingConfirmation';
import CityDashboard from './components/CityDashboard';
import RailRadarScreen from './components/RailRadarScreen';
import LoginScreen from './components/LoginScreen';
import OnboardingWizard from './components/OnboardingWizard';
import './index.css';

// ─── Global Fetch Interceptor ───
// Automatically injects Authorization header and rewrites relative URLs for native views
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('oj_token');
  let urlStr = url.toString();

  // Rewrite relative API calls for native webview context
  if (urlStr.startsWith('/api/') || urlStr.startsWith('api/')) {
    const isCapacitor = window.location.hostname === 'localhost' && !window.location.port;
    const apiHost = isCapacitor ? 'http://localhost:3001' : '';
    urlStr = `${apiHost}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
  }

  if (token && (urlStr.includes('/api/') || urlStr.includes('api/'))) {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.headers instanceof Headers) {
      options.headers.set('Authorization', `Bearer ${token}`);
    } else {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return originalFetch(urlStr, options);
};

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

const validScreens = [...screens.map(s => s.id), 'login', 'onboarding'];

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

  // Authentication State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('oj_token') || null);
  const [isOnboarded, setIsOnboarded] = useState(true);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const navigate = useCallback((screen) => {
    if (!token && screen !== 'login') {
      screen = 'login';
    }

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
  }, [routes.length, booking, showToast, token]);

  // Google OAuth Hash Parser
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      // Find oauth tokens in the fragment (e.g. access_token=...)
      // Extract parameters manually from hash
      const cleanHash = hash.replace(/^#\/?/, '');
      const params = new URLSearchParams(cleanHash);
      const accessToken = params.get('access_token');
      if (accessToken) {
        localStorage.setItem('oj_token', accessToken);
        setToken(accessToken);
        showToast('Signed in with Google!', 'success');
        navigate('home');
      }
    }
  }, [navigate, showToast]);

  // Sync token state changes & query user details
  useEffect(() => {
    if (token) {
      fetch('/api/commute-dna')
        .then(r => {
          if (r.ok) return r.json();
          throw new Error('Session expired');
        })
        .then(data => {
          setIsOnboarded(data.isOnboarded);
          if (!data.isOnboarded) {
            setActiveScreen('onboarding');
            window.location.hash = 'onboarding';
          } else {
            const currentScreen = parseHash();
            if (currentScreen === 'login' || currentScreen === 'onboarding') {
              navigate('home');
            }
          }
          try {
            // Decode basic JWT claims
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
              id: payload.sub,
              email: payload.email,
              name: payload.user_metadata?.name || payload.user_metadata?.full_name || payload.email.split('@')[0]
            });
          } catch {
            setUser({ email: 'User' });
          }
        })
        .catch(() => {
          localStorage.removeItem('oj_token');
          setToken(null);
          setUser(null);
          navigate('login');
        });
    } else {
      setUser(null);
      const currentScreen = parseHash();
      if (currentScreen !== 'login') {
        navigate('login');
      }
    }
  }, [token, navigate]);

  const handleAuthSuccess = (user, accessToken) => {
    if (accessToken) {
      localStorage.setItem('oj_token', accessToken);
      setToken(accessToken);
    }
    setUser(user);
    // Let the session effect load DNA to see if onboarding is needed
  };

  const handleOnboardingComplete = () => {
    setIsOnboarded(true);
    navigate('home');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('oj_token');
    setToken(null);
    setUser(null);
    setBooking(null);
    setRoutes([]);
    showToast('Logged out successfully', 'info');
    navigate('login');
  }, [navigate, showToast]);

  useEffect(() => {
    const onHashChange = () => {
      const target = parseHash();
      // Enforce auth
      if (!localStorage.getItem('oj_token') && target !== 'login') {
        navigate('login');
      } else {
        setActiveScreen(target);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [navigate]);

  useEffect(() => {
    if (token && (activeScreen === 'booking' || activeScreen === 'active')) {
      fetch('/api/booking')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBooking(data); })
        .catch(() => {});
    }
  }, [activeScreen, token]);

  const isDashboard = activeScreen === 'dashboard';
  const isAuthenticated = token && user;
  const showNav = isAuthenticated && isOnboarded;

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
    token,
    user,
    logout
  };

  const renderScreen = () => {
    if (!isAuthenticated) {
      return <LoginScreen onAuthSuccess={handleAuthSuccess} showToast={showToast} />;
    }
    if (!isOnboarded) {
      return <OnboardingWizard onComplete={handleOnboardingComplete} showToast={showToast} />;
    }
    switch (activeScreen) {
      case 'home': return <HomeScreen />;
      case 'results': return <JourneyResults />;
      case 'dna': return <CommuteDNA />;
      case 'active': return <ActiveJourney />;
      case 'booking': return <BookingConfirmation />;
      case 'railradar': return <RailRadarScreen />;
      case 'dashboard': return <CityDashboard />;
      case 'login': return <LoginScreen onAuthSuccess={handleAuthSuccess} showToast={showToast} />;
      case 'onboarding': return <OnboardingWizard onComplete={handleOnboardingComplete} showToast={showToast} />;
      default: return <HomeScreen />;
    }
  };

  return (
    <JourneyContext.Provider value={contextValue}>
      <ToastContext.Provider value={showToast}>
        <div className={`phone-frame ${isDashboard ? 'dashboard-mode' : ''}`}>
          {showNav && (
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
          )}

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
