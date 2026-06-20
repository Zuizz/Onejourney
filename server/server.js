import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  stations, searchStations, generateRoutes, rankRoutes,
  defaultDNA, createBooking, journeyUpdates, getDashboardData,
  getHomeSuggestion, getAlternateRoute, getSafetyPrefs, updateSafetyPrefs, triggerSOS
} from './data.js';
import { initGroq, analyzeRoutesWithAI, estimateFaresForRoute } from './groq.js';

// ─── Load environment variables manually from root .env ───
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        process.env[key] = val;
      }
    });
  }
} catch (err) {
  console.error('Failed to load .env file:', err);
}

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials missing in process.env. Make sure .env is populated.');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    persistSession: false
  }
});

// Initialize Groq AI
const groqApiKey = process.env.GROQ_API_KEY;
if (groqApiKey) {
  initGroq(groqApiKey);
} else {
  console.warn('⚠️ GROQ_API_KEY not set — AI features disabled.');
}

// In-memory route search cache (shared temporary state)
let lastRoutes = [];

// ─── Authentication Middleware ───
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
}

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  // Log in the newly created user to obtain a session
  const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    return res.status(400).json({ error: loginError.message });
  }

  if (userData?.user) {
    try {
      // Create user profile in profiles table
      const { error: dbErr } = await supabase
        .from('profiles')
        .insert([{
          id: userData.user.id,
          name,
          email,
          cost: defaultDNA.preferences.cost,
          safety: defaultDNA.preferences.safety,
          speed: defaultDNA.preferences.speed,
          comfort: defaultDNA.preferences.comfort,
          answers: null
        }]);

      if (dbErr) {
        console.error('Failed to create profile row in database:', dbErr.message);
      }
    } catch (e) {
      console.error('Database write error during signup:', e);
    }
  }

  res.json({ user: userData.user, session: sessionData.session });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ user: data.user, session: data.session });
});

// ─── Station search (autocomplete) ───
app.get('/api/stations', (req, res) => {
  const q = req.query.q || '';
  res.json(searchStations(q));
});

// ─── Route search ───
app.post('/api/routes/search', async (req, res) => {
  const { from, to, modes = [], date, time } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  let routes = generateRoutes(from, to, modes, date, time);

  // Attempt to scope ranking to user preferences if token is provided
  let preferences = defaultDNA.preferences;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: authData } = await supabase.auth.getUser(token);
      const user = authData?.user;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cost, safety, speed, comfort')
          .eq('id', user.id)
          .single();
        if (profile) {
          preferences = {
            cost: profile.cost !== null ? profile.cost : defaultDNA.preferences.cost,
            safety: profile.safety !== null ? profile.safety : defaultDNA.preferences.safety,
            speed: profile.speed !== null ? profile.speed : defaultDNA.preferences.speed,
            comfort: profile.comfort !== null ? profile.comfort : defaultDNA.preferences.comfort,
          };
        }
      }
    } catch (err) {
      console.error('Error fetching user profile for ranking:', err);
    }
  }

  // Apply Commute DNA ranking
  routes = rankRoutes(routes, preferences);
  lastRoutes = routes;

  // Determine excluded modes
  const allModes = ['Local', 'Metro', 'Bus', 'Auto', 'Cab', 'Ferry'];
  const excludedModes = allModes.filter(m => modes.length > 0 && !modes.includes(m));

  res.json({ routes, excludedModes });
});

// ─── AI: Groq-powered fare estimation + Commute DNA ranking ───
app.post('/api/ai/analyze', async (req, res) => {
  const { from, to, routes = [], dnaPreferences = null } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  // Resolve preferences from token if not provided
  let preferences = dnaPreferences || defaultDNA.preferences;
  const authHeader = req.headers.authorization;
  if (!dnaPreferences && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cost, safety, speed, comfort')
          .eq('id', authData.user.id)
          .single();
        if (profile) preferences = profile;
      }
    } catch (_) {}
  }

  try {
    if (routes.length > 0) {
      // Full route analysis: AI re-ranks + fills in fares
      const aiResult = await analyzeRoutesWithAI(from, to, routes, preferences);
      return res.json({ ok: true, aiResult, mode: 'route-analysis' });
    } else {
      // Standalone fare estimate only
      const fareResult = await estimateFaresForRoute(from, to);
      return res.json({ ok: true, fareResult, mode: 'fare-estimate' });
    }
  } catch (err) {
    console.error('Groq AI error:', err.message);
    return res.status(500).json({ error: 'AI analysis failed', detail: err.message });
  }
});

// ─── Commute DNA ───
app.get('/api/commute-dna', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('name, cost, safety, speed, comfort, answers')
      .eq('id', userId)
      .single();

    // Auto-initialize profile table if missing (e.g., OAuth users)
    if (error || !profile) {
      const name = req.user.user_metadata?.name || req.user.user_metadata?.full_name || req.user.email.split('@')[0];
      const initialProfile = {
        id: userId,
        name,
        email: req.user.email,
        cost: defaultDNA.preferences.cost,
        safety: defaultDNA.preferences.safety,
        speed: defaultDNA.preferences.speed,
        comfort: defaultDNA.preferences.comfort,
        answers: null
      };
      await supabase.from('profiles').insert([initialProfile]);
      profile = {
        cost: defaultDNA.preferences.cost,
        safety: defaultDNA.preferences.safety,
        speed: defaultDNA.preferences.speed,
        comfort: defaultDNA.preferences.comfort,
        answers: null,
        name
      };
    }

    const preferences = {
      cost: profile.cost !== null ? profile.cost : defaultDNA.preferences.cost,
      safety: profile.safety !== null ? profile.safety : defaultDNA.preferences.safety,
      speed: profile.speed !== null ? profile.speed : defaultDNA.preferences.speed,
      comfort: profile.comfort !== null ? profile.comfort : defaultDNA.preferences.comfort,
    };
    const answers = profile.answers || null;
    const isOnboarded = !!answers;

    res.json({
      preferences,
      insights: defaultDNA.insights,
      answers,
      isOnboarded,
      demoRoutes: lastRoutes.length > 0
        ? { before: lastRoutes, after: rankRoutes([...lastRoutes], preferences) }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/commute-dna', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { preferences, answers } = req.body;

  const updates = {};
  if (preferences) {
    if (preferences.cost !== undefined) updates.cost = preferences.cost;
    if (preferences.safety !== undefined) updates.safety = preferences.safety;
    if (preferences.speed !== undefined) updates.speed = preferences.speed;
    if (preferences.comfort !== undefined) updates.comfort = preferences.comfort;
  }
  if (answers) {
    updates.answers = answers;
  }

  try {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    // Load full profile to return back
    let { data: profile } = await supabase
      .from('profiles')
      .select('cost, safety, speed, comfort, answers')
      .eq('id', userId)
      .single();

    const returnedPreferences = {
      cost: profile.cost !== null ? profile.cost : defaultDNA.preferences.cost,
      safety: profile.safety !== null ? profile.safety : defaultDNA.preferences.safety,
      speed: profile.speed !== null ? profile.speed : defaultDNA.preferences.speed,
      comfort: profile.comfort !== null ? profile.comfort : defaultDNA.preferences.comfort,
    };
    const returnedAnswers = profile.answers || null;

    const reranked = lastRoutes.length > 0
      ? rankRoutes([...lastRoutes.map(r => ({ ...r }))], returnedPreferences)
      : [];

    res.json({
      preferences: returnedPreferences,
      insights: defaultDNA.insights,
      answers: returnedAnswers,
      isOnboarded: !!returnedAnswers,
      demoRoutes: lastRoutes.length > 0
        ? { before: lastRoutes, after: reranked }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Booking ───
app.post('/api/booking', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { routeId } = req.body;
  const route = lastRoutes.find(r => r.id === routeId) || lastRoutes[0];
  if (!route) {
    return res.status(400).json({ error: 'No route found. Search for routes first.' });
  }

  const newBooking = createBooking(route);

  try {
    const { error: dbErr } = await supabase
      .from('bookings')
      .insert([{
        user_id: userId,
        route: newBooking.route,
        ticket_id: newBooking.ticketId,
        from_station: newBooking.from,
        to_station: newBooking.to,
        mode: newBooking.mode,
        cost: parseFloat(newBooking.cost.replace(/[^0-9.]/g, '')) || 0,
        duration: newBooking.duration,
        co2_saved: parseFloat(newBooking.co2Saved) || 0
      }]);

    if (dbErr) {
      return res.status(500).json({ error: dbErr.message });
    }

    res.json(newBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: bookingRows, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ error: 'No active booking' });
    }

    const latest = bookingRows[0];
    const activeBooking = {
      ticketId: latest.ticket_id,
      from: latest.from_station,
      to: latest.to_station,
      date: new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: 'Today',
      mode: latest.mode,
      cost: `₹${latest.cost}`,
      duration: latest.duration,
      co2Saved: `${latest.co2_saved} kg`,
      route: latest.route,
      status: 'CONFIRMED'
    };

    res.json(activeBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Live Journey (SSE) ───
app.get('/api/journey/live', async (req, res) => {
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
  if (authErr || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  try {
    const { data: bookingRows, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ error: 'No active booking to track' });
    }

    const latest = bookingRows[0];

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const gen = journeyUpdates(latest.route);

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
app.post('/api/journey/switch-route', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: bookingRows, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ error: 'No active booking' });
    }

    const latest = bookingRows[0];
    const alternate = getAlternateRoute(latest.route.id, lastRoutes);
    if (!alternate) {
      return res.status(404).json({ error: 'No alternate routes available' });
    }

    const newBooking = createBooking(alternate);

    const { error: dbErr } = await supabase
      .from('bookings')
      .insert([{
        user_id: userId,
        route: newBooking.route,
        ticket_id: newBooking.ticketId,
        from_station: newBooking.from,
        to_station: newBooking.to,
        mode: newBooking.mode,
        cost: parseFloat(newBooking.cost.replace(/[^0-9.]/g, '')) || 0,
        duration: newBooking.duration,
        co2_saved: parseFloat(newBooking.co2Saved) || 0
      }]);

    if (dbErr) {
      return res.status(500).json({ error: dbErr.message });
    }

    res.json({ booking: newBooking, message: `Switched to ${alternate.title}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Safety preferences ───
app.get('/api/journey/safety', (req, res) => {
  res.json(getSafetyPrefs());
});

// ─── Safety preferences update ───
app.put('/api/journey/safety', (req, res) => {
  res.json(updateSafetyPrefs(req.body));
});

// ─── SOS emergency ───
app.post('/api/journey/sos', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: bookingRows, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ error: 'No active booking' });
    }

    const latest = bookingRows[0];
    const activeBooking = {
      ticketId: latest.ticket_id,
      from: latest.from_station,
      to: latest.to_station,
      mode: latest.mode,
      route: latest.route
    };
    res.json(triggerSOS(activeBooking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
