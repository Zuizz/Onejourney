import express from 'express';
import cors from 'cors';
import {
  stations, searchStations, generateRoutes, rankRoutes,
  defaultDNA, createBooking, journeyUpdates, getDashboardData,
  getHomeSuggestion, getAlternateRoute, getSafetyPrefs, updateSafetyPrefs, triggerSOS
} from './data.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory state (per-session)
let userDNA = JSON.parse(JSON.stringify(defaultDNA));
let lastRoutes = [];
let activeBooking = null;
let activeJourneyGen = null;

// ─── Station search (autocomplete) ───
app.get('/api/stations', (req, res) => {
  const q = req.query.q || '';
  res.json(searchStations(q));
});

// ─── Route search ───
app.post('/api/routes/search', (req, res) => {
  const { from, to, modes = [] } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  let routes = generateRoutes(from, to, modes);

  // Apply Commute DNA ranking
  routes = rankRoutes(routes, userDNA.preferences);
  lastRoutes = routes;

  // Determine excluded modes
  const allModes = ['Local', 'Metro', 'Bus', 'Auto', 'Cab', 'Ferry'];
  const excludedModes = allModes.filter(m => modes.length > 0 && !modes.includes(m));

  res.json({ routes, excludedModes });
});

// ─── Commute DNA ───
app.get('/api/commute-dna', (req, res) => {
  res.json({
    preferences: userDNA.preferences,
    insights: userDNA.insights,
    demoRoutes: lastRoutes.length > 0
      ? { before: lastRoutes, after: rankRoutes([...lastRoutes], userDNA.preferences) }
      : null,
  });
});

app.put('/api/commute-dna', (req, res) => {
  const { preferences } = req.body;
  if (preferences) {
    userDNA.preferences = { ...userDNA.preferences, ...preferences };
  }

  // Re-rank last routes with new preferences
  const reranked = lastRoutes.length > 0
    ? rankRoutes([...lastRoutes.map(r => ({ ...r }))], userDNA.preferences)
    : [];

  res.json({
    preferences: userDNA.preferences,
    insights: userDNA.insights,
    demoRoutes: lastRoutes.length > 0
      ? { before: lastRoutes, after: reranked }
      : null,
  });
});

// ─── Booking ───
app.post('/api/booking', (req, res) => {
  const { routeId } = req.body;
  const route = lastRoutes.find(r => r.id === routeId) || lastRoutes[0];
  if (!route) {
    return res.status(400).json({ error: 'No route found. Search for routes first.' });
  }

  activeBooking = createBooking(route);
  activeJourneyGen = null; // Reset journey
  res.json(activeBooking);
});

app.get('/api/booking', (req, res) => {
  if (!activeBooking) {
    return res.status(404).json({ error: 'No active booking' });
  }
  res.json(activeBooking);
});

// ─── Live Journey (SSE) ───
app.get('/api/journey/live', (req, res) => {
  if (!activeBooking) {
    return res.status(404).json({ error: 'No active booking to track' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const gen = journeyUpdates(activeBooking.route);
  activeJourneyGen = gen;

  const interval = setInterval(() => {
    const { value, done } = gen.next();
    if (done) {
      res.write(`data: ${JSON.stringify({ completed: true })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify(value)}\n\n`);
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ─── Dashboard ───
app.get('/api/dashboard', (req, res) => {
  res.json(getDashboardData());
});

// ─── Home suggestions ───
app.post('/api/home/suggestions', (req, res) => {
  const { recentTrips = [] } = req.body;
  res.json(getHomeSuggestion(recentTrips));
});

// ─── Switch route during live journey ───
app.post('/api/journey/switch-route', (req, res) => {
  if (!activeBooking) {
    return res.status(404).json({ error: 'No active booking' });
  }
  const alternate = getAlternateRoute(activeBooking.route.id, lastRoutes);
  if (!alternate) {
    return res.status(404).json({ error: 'No alternate routes available' });
  }
  activeBooking = createBooking(alternate);
  activeJourneyGen = null;
  res.json({ booking: activeBooking, message: `Switched to ${alternate.title}` });
});

// ─── Safety preferences ───
app.get('/api/journey/safety', (req, res) => {
  res.json(getSafetyPrefs());
});

app.put('/api/journey/safety', (req, res) => {
  res.json(updateSafetyPrefs(req.body));
});

// ─── SOS emergency ───
app.post('/api/journey/sos', (req, res) => {
  if (!activeBooking) {
    return res.status(404).json({ error: 'No active booking' });
  }
  res.json(triggerSOS(activeBooking));
});

export default app;

// ─── Start (local dev only) ───
const isDirectRun = process.argv[1]?.endsWith('server.js');
if (isDirectRun) {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`\n  🚀 OneJourney API running on http://localhost:${PORT}`);
    console.log(`  📍 Mumbai transit data: ${stations.length} stations loaded\n`);
  });
}
