// Mumbai Station Graph & Route Generation Engine

// ─── Station Pool (~20 key nodes with lat/lng) ───
export const stations = [
  // South Mumbai
  { id: 'churchgate', name: 'Churchgate', zone: 'South Mumbai', lat: 18.9322, lng: 72.8264, lines: ['western'] },
  { id: 'cst', name: 'CST', zone: 'South Mumbai', lat: 18.9398, lng: 72.8355, lines: ['central', 'harbour'] },
  { id: 'marine_lines', name: 'Marine Lines', zone: 'South Mumbai', lat: 18.9439, lng: 72.8234, lines: ['western'] },
  { id: 'lower_parel', name: 'Lower Parel', zone: 'South Mumbai', lat: 18.9932, lng: 72.8302, lines: ['western'] },
  { id: 'worli', name: 'Worli', zone: 'South Mumbai', lat: 19.0176, lng: 72.8151, lines: ['bus'] },

  // Central Mumbai
  { id: 'dadar', name: 'Dadar', zone: 'Central Mumbai', lat: 19.0186, lng: 72.8425, lines: ['western', 'central'] },
  { id: 'parel', name: 'Parel', zone: 'Central Mumbai', lat: 19.0048, lng: 72.8390, lines: ['central'] },
  { id: 'byculla', name: 'Byculla', zone: 'Central Mumbai', lat: 18.9790, lng: 72.8333, lines: ['central'] },
  { id: 'matunga', name: 'Matunga', zone: 'Central Mumbai', lat: 19.0227, lng: 72.8480, lines: ['central'] },

  // Western Suburbs
  { id: 'bandra', name: 'Bandra', zone: 'Western Suburbs', lat: 19.0544, lng: 72.8404, lines: ['western'] },
  { id: 'andheri', name: 'Andheri', zone: 'Western Suburbs', lat: 19.1197, lng: 72.8464, lines: ['western', 'metro1'] },
  { id: 'goregaon', name: 'Goregaon', zone: 'Western Suburbs', lat: 19.1553, lng: 72.8492, lines: ['western'] },
  { id: 'malad', name: 'Malad', zone: 'Western Suburbs', lat: 19.1858, lng: 72.8484, lines: ['western'] },
  { id: 'borivali', name: 'Borivali', zone: 'Western Suburbs', lat: 19.2288, lng: 72.8567, lines: ['western'] },

  // Eastern Suburbs
  { id: 'ghatkopar', name: 'Ghatkopar', zone: 'Eastern Suburbs', lat: 19.0867, lng: 72.9082, lines: ['central', 'metro1'] },
  { id: 'powai', name: 'Powai', zone: 'Eastern Suburbs', lat: 19.1176, lng: 72.9060, lines: ['bus'] },
  { id: 'vikhroli', name: 'Vikhroli', zone: 'Eastern Suburbs', lat: 19.1064, lng: 72.9274, lines: ['central'] },
  { id: 'mulund', name: 'Mulund', zone: 'Eastern Suburbs', lat: 19.1729, lng: 72.9564, lines: ['central'] },

  // Business Hubs
  { id: 'bkc', name: 'BKC', zone: 'Western Suburbs', lat: 19.0658, lng: 72.8691, lines: ['bus', 'metro3'] },

  // Navi Mumbai
  { id: 'vashi', name: 'Vashi', zone: 'Navi Mumbai', lat: 19.0771, lng: 72.9987, lines: ['harbour'] },
  { id: 'belapur', name: 'CBD Belapur', zone: 'Navi Mumbai', lat: 19.0233, lng: 73.0396, lines: ['harbour'] },
  { id: 'panvel', name: 'Panvel', zone: 'Navi Mumbai', lat: 18.9932, lng: 73.1175, lines: ['harbour', 'central'] },

  // Thane
  { id: 'thane', name: 'Thane', zone: 'Thane', lat: 19.1860, lng: 72.9750, lines: ['central'] },
];

// ─── Distance helper (Haversine) ───
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Mode configs ───
const modeConfig = {
  'Local': { speedKmMin: 0.5, costBase: 5, costPerKm: 0.8, co2PerKm: 0.01, safetyBase: 7.5, comfortBase: 4 },
  'Metro': { speedKmMin: 0.65, costBase: 10, costPerKm: 2.5, co2PerKm: 0.02, safetyBase: 9.0, comfortBase: 8 },
  'Bus':   { speedKmMin: 0.3, costBase: 6, costPerKm: 1.2, co2PerKm: 0.06, safetyBase: 7.0, comfortBase: 5 },
  'Auto':  { speedKmMin: 0.4, costBase: 23, costPerKm: 16, co2PerKm: 0.08, safetyBase: 7.5, comfortBase: 6 },
  'Cab':   { speedKmMin: 0.35, costBase: 25, costPerKm: 14, co2PerKm: 0.12, safetyBase: 7.8, comfortBase: 9 },
  'Ferry': { speedKmMin: 0.25, costBase: 15, costPerKm: 3, co2PerKm: 0.04, safetyBase: 8.5, comfortBase: 7 },
};

// ─── Find station by name or id ───
export function findStation(query) {
  const q = query.toLowerCase().trim();
  return stations.find(s => s.id === q || s.name.toLowerCase() === q) || null;
}

// ─── Search stations (autocomplete) ───
export function searchStations(query) {
  const q = query.toLowerCase().trim();
  if (!q) return stations.slice(0, 8);
  return stations.filter(s =>
    s.name.toLowerCase().includes(q) || s.zone.toLowerCase().includes(q)
  ).slice(0, 8);
}

// ─── Generate intermediate waypoints for a route segment ───
function getIntermediates(from, to, line) {
  const lineStations = stations.filter(s => s.lines.includes(line));
  const fromIdx = lineStations.findIndex(s => s.id === from.id);
  const toIdx = lineStations.findIndex(s => s.id === to.id);
  if (fromIdx === -1 || toIdx === -1) return [];
  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  return lineStations.slice(start, end + 1).map(s => s.name);
}

// ─── Route generation ───
export function generateRoutes(fromName, toName, selectedModes = []) {
  const from = findStation(fromName);
  const to = findStation(toName);

  if (!from || !to) {
    // Fallback: find closest matches
    const fromStation = from || stations[0];
    const toStation = to || stations[5];
    return generateRoutesFromStations(fromStation, toStation, selectedModes);
  }

  return generateRoutesFromStations(from, to, selectedModes);
}

function generateRoutesFromStations(from, to, selectedModes) {
  const dist = haversine(from.lat, from.lng, to.lat, to.lng);
  const activeModes = selectedModes.length > 0 ? selectedModes : ['Local', 'Metro', 'Bus', 'Auto'];
  const routes = [];
  let idCounter = 1;

  // Route 1: Best transit combo (Local/Metro)
  const hasLocal = activeModes.includes('Local');
  const hasMetro = activeModes.includes('Metro');
  if (hasLocal || hasMetro) {
    const primaryMode = hasMetro ? 'Metro' : 'Local';
    const cfg = modeConfig[primaryMode];
    const transitDist = dist * 0.85;
    const walkDist = dist * 0.15;
    const transitMin = Math.round(transitDist / cfg.speedKmMin);
    const walkMin = Math.round(walkDist * 12);
    const totalMin = transitMin + walkMin;
    const cost = Math.round(cfg.costBase + cfg.costPerKm * transitDist);
    const co2 = Math.round(cfg.co2PerKm * transitDist * 100) / 100;
    const safety = Math.round((cfg.safetyBase + Math.random() * 0.8) * 10) / 10;

    const sharedLine = from.lines.find(l => to.lines.includes(l));
    const steps = [];
    steps.push(`Walk ${Math.max(3, walkMin)} min to ${from.name} station`);
    if (sharedLine) {
      steps.push(`${primaryMode} ${sharedLine.charAt(0).toUpperCase() + sharedLine.slice(1)} Line → ${to.name}`);
    } else {
      const interchange = from.lines.includes('western') ? 'Dadar' :
        from.lines.includes('central') ? 'Dadar' : 'Andheri';
      steps.push(`${primaryMode} → ${interchange} (interchange)`);
      steps.push(`${primaryMode} → ${to.name}`);
    }
    steps.push(`Walk ${Math.max(2, Math.round(walkDist * 6))} min to destination`);

    routes.push({
      id: idCounter++,
      title: sharedLine
        ? `${primaryMode} ${sharedLine.charAt(0).toUpperCase() + sharedLine.slice(1)} Line`
        : `${primaryMode} (with interchange)`,
      recommended: true,
      duration: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60} min` : `${totalMin} min`,
      durationMin: totalMin,
      cost: `₹${cost}`,
      costVal: cost,
      co2: `${co2} kg`,
      co2Val: co2,
      safety: `${safety}/10`,
      safetyVal: safety,
      comfort: cfg.comfortBase,
      steps,
      insight: `Most efficient ${primaryMode.toLowerCase()} route for this corridor`,
      timeSaved: `${Math.round(dist * 1.5)} min faster than road`,
      modes: [primaryMode],
      from: from.name,
      to: to.name,
      waypoints: [from, to].map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
    });
  }

  // Route 2: Bus combo
  if (activeModes.includes('Bus')) {
    const busCfg = modeConfig['Bus'];
    const busDist = dist * 1.1; // buses take longer routes
    const walkDist = dist * 0.08;
    const busMin = Math.round(busDist / busCfg.speedKmMin);
    const walkMin = Math.round(walkDist * 12);
    const totalMin = busMin + walkMin;
    const cost = Math.round(busCfg.costBase + busCfg.costPerKm * busDist);
    const co2 = Math.round(busCfg.co2PerKm * busDist * 100) / 100;
    const safety = Math.round((busCfg.safetyBase + Math.random() * 0.6) * 10) / 10;

    const busNumber = `${Math.floor(Math.random() * 500) + 100}`;

    // Maybe combine with local
    const hasLocalToo = activeModes.includes('Local');
    const steps = [];
    if (hasLocalToo && dist > 10) {
      const localCfg = modeConfig['Local'];
      const localDist = dist * 0.5;
      const localBusDist = dist * 0.5;
      const combinedMin = Math.round(localDist / localCfg.speedKmMin + localBusDist / busCfg.speedKmMin + 8);
      const combinedCost = Math.round(localCfg.costBase + localCfg.costPerKm * localDist + busCfg.costBase + busCfg.costPerKm * localBusDist);
      steps.push(`Walk ${Math.max(3, walkMin)} min`);
      steps.push(`Local Train → Dadar`);
      steps.push(`BEST Bus ${busNumber} → ${to.name}`);
      steps.push(`Walk ${Math.max(2, Math.round(walkDist * 4))} min`);

      routes.push({
        id: idCounter++,
        title: `Local + BEST Bus ${busNumber}`,
        recommended: false,
        duration: combinedMin >= 60 ? `${Math.floor(combinedMin / 60)}h ${combinedMin % 60} min` : `${combinedMin} min`,
        durationMin: combinedMin,
        cost: `₹${combinedCost}`,
        costVal: combinedCost,
        co2: `${Math.round((localCfg.co2PerKm * localDist + busCfg.co2PerKm * localBusDist) * 100) / 100} kg`,
        co2Val: Math.round((localCfg.co2PerKm * localDist + busCfg.co2PerKm * localBusDist) * 100) / 100,
        safety: `${safety}/10`,
        safetyVal: safety,
        comfort: 5,
        steps,
        insight: 'Most affordable multimodal option',
        timeSaved: null,
        modes: ['Local', 'Bus'],
        from: from.name,
        to: to.name,
        waypoints: [from, { name: 'Dadar', lat: 19.0186, lng: 72.8425 }, to].map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
      });
    } else {
      steps.push(`Walk ${Math.max(3, walkMin)} min to bus stop`);
      steps.push(`BEST Bus ${busNumber} → ${to.name}`);
      steps.push(`Walk ${Math.max(2, Math.round(walkDist * 4))} min`);

      routes.push({
        id: idCounter++,
        title: `BEST Bus ${busNumber}`,
        recommended: false,
        duration: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60} min` : `${totalMin} min`,
        durationMin: totalMin,
        cost: `₹${cost}`,
        costVal: cost,
        co2: `${co2} kg`,
        co2Val: co2,
        safety: `${safety}/10`,
        safetyVal: safety,
        comfort: busCfg.comfortBase,
        steps,
        insight: 'Budget-friendly option',
        timeSaved: null,
        modes: ['Bus'],
        from: from.name,
        to: to.name,
        waypoints: [from, to].map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
      });
    }
  }

  // Route 3: Auto/Cab (road-based)
  const roadMode = activeModes.includes('Auto') ? 'Auto' : activeModes.includes('Cab') ? 'Cab' : null;
  if (roadMode) {
    const cfg = modeConfig[roadMode];
    const roadDist = dist * 1.2;
    const totalMin = Math.round(roadDist / cfg.speedKmMin);
    const cost = Math.round(cfg.costBase + cfg.costPerKm * roadDist);
    const co2 = Math.round(cfg.co2PerKm * roadDist * 100) / 100;
    const safety = Math.round((cfg.safetyBase + Math.random() * 0.5) * 10) / 10;

    routes.push({
      id: idCounter++,
      title: `${roadMode}-rickshaw direct`,
      recommended: false,
      duration: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60} min` : `${totalMin} min`,
      durationMin: totalMin,
      cost: `₹${cost}`,
      costVal: cost,
      co2: `${co2} kg`,
      co2Val: co2,
      safety: `${safety}/10`,
      safetyVal: safety,
      comfort: cfg.comfortBase,
      steps: [
        `${roadMode} pickup at ${from.name}`,
        `Direct ride via road → ${to.name}`,
      ],
      insight: roadMode === 'Cab' ? 'Most comfortable door-to-door' : 'Convenient but higher cost',
      timeSaved: null,
      modes: [roadMode],
      from: from.name,
      to: to.name,
      waypoints: [from, to].map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
    });
  }

  // Route 4: Metro + Auto combo (if both available and distance > 8km)
  if (activeModes.includes('Metro') && (activeModes.includes('Auto') || activeModes.includes('Bus')) && dist > 8) {
    const metroCfg = modeConfig['Metro'];
    const lastMile = activeModes.includes('Auto') ? 'Auto' : 'Bus';
    const lastCfg = modeConfig[lastMile];
    const metroDist = dist * 0.7;
    const lastDist = dist * 0.3;
    const totalMin = Math.round(metroDist / metroCfg.speedKmMin + lastDist / lastCfg.speedKmMin + 5);
    const cost = Math.round(metroCfg.costBase + metroCfg.costPerKm * metroDist + lastCfg.costBase + lastCfg.costPerKm * lastDist);
    const co2 = Math.round((metroCfg.co2PerKm * metroDist + lastCfg.co2PerKm * lastDist) * 100) / 100;
    const safety = Math.round(((metroCfg.safetyBase * 0.7 + lastCfg.safetyBase * 0.3) + Math.random() * 0.3) * 10) / 10;

    routes.push({
      id: idCounter++,
      title: `Metro + ${lastMile}`,
      recommended: false,
      duration: totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60} min` : `${totalMin} min`,
      durationMin: totalMin,
      cost: `₹${cost}`,
      costVal: cost,
      co2: `${co2} kg`,
      co2Val: co2,
      safety: `${safety}/10`,
      safetyVal: safety,
      comfort: 7,
      steps: [
        `Walk 5 min to metro station`,
        `Metro Line 1 → Ghatkopar / Andheri`,
        `${lastMile} → ${to.name}`,
      ],
      insight: 'Good balance of speed & comfort',
      timeSaved: null,
      modes: ['Metro', lastMile],
      from: from.name,
      to: to.name,
      waypoints: [
        from,
        stations.find(s => s.id === 'andheri') || stations[10],
        to
      ].map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
    });
  }

  // Mark the first route as recommended if we have routes
  if (routes.length > 0) {
    routes.forEach((r, i) => { r.recommended = i === 0; });
  }

  return routes;
}

// ─── Rank routes by Commute DNA preferences ───
export function rankRoutes(routes, preferences) {
  const { cost = 50, safety = 50, speed = 50, comfort = 50 } = preferences;
  const total = cost + safety + speed + comfort || 1;
  const w = { cost: cost / total, safety: safety / total, speed: speed / total, comfort: comfort / total };

  const maxCost = Math.max(...routes.map(r => r.costVal), 1);
  const maxDuration = Math.max(...routes.map(r => r.durationMin), 1);

  const scored = routes.map(r => {
    const costScore = (1 - r.costVal / maxCost) * w.cost;
    const safetyScore = (r.safetyVal / 10) * w.safety;
    const speedScore = (1 - r.durationMin / maxDuration) * w.speed;
    const comfortScore = (r.comfort / 10) * w.comfort;
    return { ...r, score: costScore + safetyScore + speedScore + comfortScore };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((r, i) => { r.recommended = i === 0; });

  // Update insights based on ranking
  if (scored.length > 0) {
    scored[0].insight = 'Best match for your Commute DNA preferences';
    scored[0].timeSaved = `Personalized ranking based on your profile`;
  }

  return scored;
}

// ─── Commute DNA defaults ───
export const defaultDNA = {
  preferences: { cost: 45, safety: 82, speed: 70, comfort: 35 },
  insights: [
    {
      icon: '🕐',
      title: 'Peak Hour Patterns',
      description: 'You travel during 8:30–9:15 AM on the Western Line. Routes optimized for this window.',
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      icon: '🛡️',
      title: 'Safety Conscious',
      description: 'You prefer Metro & AC Local over regular trains. Safety score threshold: 8.0+',
      color: '#6366f1',
      bg: '#eef2ff',
    },
    {
      icon: '🌧️',
      title: 'Monsoon Aware',
      description: 'During monsoon, you switch from Local to Metro/Cab. We auto-adjust your routes Jun–Sep.',
      color: '#10b981',
      bg: '#ecfdf5',
    },
  ],
};

// ─── Booking generator ───
let bookingCounter = 4800;
export function createBooking(route) {
  bookingCounter++;
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    ticketId: `OJ-2026-${bookingCounter}`,
    from: route.from,
    to: route.to,
    fromCode: route.from.substring(0, 3).toUpperCase(),
    toCode: route.to.substring(0, 3).toUpperCase(),
    duration: route.duration,
    mode: route.modes.join(' + '),
    cost: route.cost,
    date: `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`,
    co2Saved: `${Math.round((route.co2Val * 4 - route.co2Val) * 10) / 10} kg`,
    route,
  };
}

// ─── Live Journey Simulation ───
export function* journeyUpdates(route) {
  const waypoints = route.waypoints || [
    { name: route.from, lat: 19.12, lng: 72.85 },
    { name: route.to, lat: 19.07, lng: 72.87 },
  ];

  const totalSteps = 60;
  const alerts = [
    { step: 5, message: 'Harbour Line delayed between Wadala–Kurla due to signal failure (~8 min)', type: 'warning' },
    { step: 25, message: 'Approaching interchange station. Follow signs for transfer.', type: 'info' },
    { step: 45, message: 'Next stop is your destination. Prepare to alight.', type: 'info' },
  ];

  for (let i = 0; i <= totalSteps; i++) {
    const progress = i / totalSteps;
    const segIdx = Math.min(Math.floor(progress * (waypoints.length - 1)), waypoints.length - 2);
    const segProgress = (progress * (waypoints.length - 1)) - segIdx;
    const wp0 = waypoints[segIdx];
    const wp1 = waypoints[Math.min(segIdx + 1, waypoints.length - 1)];

    const lat = wp0.lat + (wp1.lat - wp0.lat) * segProgress;
    const lng = wp0.lng + (wp1.lng - wp0.lng) * segProgress;

    const remainingMin = Math.round(route.durationMin * (1 - progress));
    const stopsLeft = Math.max(0, waypoints.length - 1 - segIdx);
    const nextStop = wp1.name;

    const alert = alerts.find(a => a.step === i);

    yield {
      progress: Math.round(progress * 100),
      lat, lng,
      eta: `${remainingMin} min`,
      nextStop,
      stopsLeft,
      alert: alert || null,
      completed: i === totalSteps,
    };
  }
}

// ─── Dashboard Data ───
export function getDashboardData() {
  const hour = new Date().getHours();
  const dayFactor = 1 + Math.sin(hour * Math.PI / 12) * 0.3;

  return {
    metrics: [
      { title: 'Daily Ridership', value: `${(7.5 * dayFactor).toFixed(1)}M`, change: '+8.2%', up: true },
      { title: 'Modal Shift Rate', value: '28.4%', change: '+4.7%', up: true },
      { title: 'Avg Trip Duration', value: `${Math.round(47 * dayFactor)} min`, change: '-2.8%', up: false },
      { title: 'Active Routes', value: `${Math.round(2100 * dayFactor)}`, change: '+124', up: true },
    ],
    heatmap: {
      headers: ['Zone', '6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
      rows: [
        ['South Mumbai', 3, 8, 5, 4, 5, 7, 9, 4],
        ['Bandra-Kurla', 2, 10, 6, 3, 4, 8, 10, 3],
        ['Andheri-Goregaon', 3, 9, 4, 3, 5, 7, 9, 3],
        ['Thane-Mulund', 2, 9, 5, 3, 4, 7, 8, 2],
        ['Navi Mumbai', 3, 7, 4, 3, 4, 6, 7, 2],
        ['Airport Zone', 4, 6, 5, 5, 6, 7, 6, 5],
      ],
    },
    chartData: [
      { month: 'Jan', 'Mumbai Local': 48, 'Metro': 12, 'BEST Bus': 28, Auto: 12 },
      { month: 'Feb', 'Mumbai Local': 47, 'Metro': 14, 'BEST Bus': 27, Auto: 12 },
      { month: 'Mar', 'Mumbai Local': 45, 'Metro': 17, 'BEST Bus': 26, Auto: 12 },
      { month: 'Apr', 'Mumbai Local': 44, 'Metro': 19, 'BEST Bus': 25, Auto: 12 },
      { month: 'May', 'Mumbai Local': 42, 'Metro': 22, 'BEST Bus': 24, Auto: 12 },
      { month: 'Jun', 'Mumbai Local': 40, 'Metro': 25, 'BEST Bus': 23, Auto: 12 },
    ],
    insights: [
      { priority: 'HIGH', title: 'Western Line Overcrowding at Andheri', desc: 'Peak hour capacity at 135%. Recommend additional 15-car services between Churchgate and Borivali during 8–10 AM.' },
      { priority: 'MEDIUM', title: 'BEST Route 352 Underperforming', desc: 'Ridership down 22% since Metro Line 1 opened. Consider route rationalization or feeder service conversion.' },
      { priority: 'LOW', title: 'Metro Line 3 Corridor Impact', desc: 'Projected to reduce Colaba–SEEPZ road traffic by 30%. Pre-plan feeder bus routes for new metro stations.' },
    ],
    cityStats: [
      { label: 'Total Trips Today', value: `${(12.4 * dayFactor).toFixed(1)}M` },
      { label: 'CO₂ Saved (Month)', value: '3,840 tons' },
      { label: 'Avg Satisfaction', value: '3.9 / 5.0' },
      { label: 'ONDC Integrations', value: '52 providers' },
    ],
  };
}
