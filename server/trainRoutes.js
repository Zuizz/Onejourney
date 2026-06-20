import fs from 'fs';
import path from 'path';

// ─── In-memory stores ───
export const trainStations = new Set();
export const trainRouteMap = new Map(); // "from->to" => [service, ...]

// ─── Mumbai Central Line: station distances from CST (km) ───
const STATION_KM = {
  'mumbai cst': 0,
  'masjid': 1.3,
  'sandhurst road': 2.1,
  'byculla': 3.1,
  'chinchpokli': 4.0,
  'currey road': 4.7,
  'parel': 5.7,
  'dadar': 7.3,
  'matunga': 8.3,
  'sion': 10.1,
  'kurla': 12.5,
  'vidyavihar': 13.7,
  'ghatkopar': 15.7,
  'vikhroli': 18.0,
  'kanjurmarg': 19.3,
  'bhandup': 20.3,
  'nahur': 21.5,
  'mulund': 22.8,
  'thane': 25.4,
  'kalwa': 27.0,
  'mumbra': 30.0,
  'diva': 32.4,
  'kopar': 34.6,
  'dombivli': 35.6,
  'thakurli': 36.9,
  'kalyan': 39.3,
  'shahad': 41.7,
  'ambivli': 43.4,
  'titwala': 48.0,
  'vithalwadi': 40.9,
  'ulhasnagar': 42.2,
  'ambernath': 45.5,
  'badlapur': 52.5,
  'vangani': 62.0,
  'shelu': 65.0,
  'neral': 68.0,
  'bhivpuri': 74.0,
  'karjat': 88.0,
  'palasdari': 92.0,
  'kelavli': 96.0,
  'dolavli': 99.0,
  'lowjee': 103.0,
  'khopoli': 108.0,
  'khadavli': 55.0,
  'vasind': 62.0,
  'asangaon': 70.0,
  'atgaon': 80.0,
  'khardi': 93.0,
  'kasara': 117.0,
};

// ─── Mumbai Local fare slab (Second class) ───
function calcFare(distanceKm) {
  if (distanceKm <= 5)  return 5;
  if (distanceKm <= 10) return 10;
  if (distanceKm <= 15) return 15;
  if (distanceKm <= 20) return 20;
  if (distanceKm <= 30) return 25;
  return 30;
}

// ─── Station distance lookup (approximate) ───
function getDistance(fromName, toName) {
  const fk = fromName.toLowerCase().trim();
  const tk = toName.toLowerCase().trim();
  const fd = STATION_KM[fk] ?? null;
  const td = STATION_KM[tk] ?? null;
  if (fd !== null && td !== null) return Math.abs(td - fd);
  return 20; // fallback
}

// ─── Deterministic lat/lng for Mumbai area stations ───
export function getTrainLatLng(name) {
  const known = {
    'mumbai cst': { lat: 18.9398, lng: 72.8355 },
    'dadar':      { lat: 19.0186, lng: 72.8425 },
    'thane':      { lat: 19.1860, lng: 72.9750 },
    'kalyan':     { lat: 19.2437, lng: 73.1298 },
    'kurla':      { lat: 19.0724, lng: 72.8795 },
    'ghatkopar':  { lat: 19.0867, lng: 72.9082 },
    'dombivli':   { lat: 19.2167, lng: 73.0833 },
    'byculla':    { lat: 18.9790, lng: 72.8333 },
    'mulund':     { lat: 19.1729, lng: 72.9564 },
    'titwala':    { lat: 19.2942, lng: 73.2001 },
    'ambernath':  { lat: 19.2013, lng: 73.1868 },
    'badlapur':   { lat: 19.1597, lng: 73.2367 },
    'kasara':     { lat: 19.6020, lng: 73.4721 },
    'karjat':     { lat: 18.9133, lng: 73.3194 },
    'khopoli':    { lat: 18.7909, lng: 73.3433 },
  };
  const k = name.toLowerCase().trim();
  if (known[k]) return known[k];
  // fallback: hash-based in Mumbai region
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const lat = 18.9 + (Math.abs(hash) % 80) / 100;
  const lng = 72.8 + (Math.abs(hash >> 6) % 30) / 100;
  return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) };
}

// ─── Parse "9:14 am" / "12:01 am" -> minutes from midnight ───
function parseTime(t) {
  if (!t || !t.trim()) return null;
  const m = t.trim().match(/^(\d+):(\d+)\s*(am|pm)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ap = m[3].toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

function minutesToDisplay(min) {
  if (min === null) return null;
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Load & parse the column-oriented CSV ───
export function loadTrainRoutes() {
  try {
    const csvPath = path.resolve(process.cwd(), 'Datasets', 'Mumbai_Local_Train_Timetable.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️ Mumbai local train CSV not found at:', csvPath);
      return;
    }

    const raw = fs.readFileSync(csvPath, 'utf8');
    const allLines = raw.split('\n').map(l => l.replace(/\r$/, ''));

    // ── Walk through all lines, collect "blocks" delimited by `source,` rows ──
    let i = 0;
    let totalServices = 0;

    while (i < allLines.length) {
      const line = allLines[i].trim();

      // Look for a row that starts with "source,"
      if (!line.toLowerCase().startsWith('source,')) { i++; continue; }

      // Collect the block: source, destination, speed, then station rows until empty line
      const blockLines = [];
      while (i < allLines.length && allLines[i].trim() !== '') {
        blockLines.push(allLines[i]);
        i++;
      }
      // skip empty separator
      i++;

      if (blockLines.length < 4) continue; // need source, dest, speed + ≥1 station

      const splitRow = r => r.split(',');

      const sourceRow = splitRow(blockLines[0]);
      const destRow   = splitRow(blockLines[1]);
      const speedRow  = splitRow(blockLines[2]);

      const fromName = (sourceRow[1] || '').trim();
      const toName   = (destRow[1]   || '').trim();
      if (!fromName || !toName) continue;

      // Number of service columns (all columns after label column)
      const numServices = sourceRow.length - 1;

      // Build station-time lookup for this block: stationName -> [time per service]
      const stationTimes = {};
      for (let r = 3; r < blockLines.length; r++) {
        const cols = splitRow(blockLines[r]);
        const stName = (cols[0] || '').trim();
        if (!stName) continue;
        stationTimes[stName.toLowerCase()] = cols.slice(1);
        trainStations.add(stName);
      }

      // Source station times
      const fromTimes = stationTimes[fromName.toLowerCase()];
      // Destination station times
      const toTimes   = stationTimes[toName.toLowerCase()];
      if (!fromTimes || !toTimes) continue;

      trainStations.add(fromName);
      trainStations.add(toName);

      const key = `${fromName.toLowerCase()}->${toName.toLowerCase()}`;
      if (!trainRouteMap.has(key)) trainRouteMap.set(key, []);

      for (let col = 0; col < numServices; col++) {
        const dep = (fromTimes[col] || '').trim();
        const arr = (toTimes[col]   || '').trim();
        if (!dep || !arr) continue;

        const speed = (speedRow[col + 1] || '').trim(); // S / F / M

        trainRouteMap.get(key).push({ from: fromName, to: toName, dep, arr, speed });
        totalServices++;
      }
    }

    console.log(`🚆 Loaded ${totalServices} Mumbai local train services across ${trainRouteMap.size} routes, ${trainStations.size} stations.`);
  } catch (err) {
    console.error('Failed to load train routes CSV:', err);
  }
}

// ─── Autocomplete for train station names ───
export function searchTrainStations(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const matches = [];
  for (const name of trainStations) {
    if (name.toLowerCase().includes(q)) {
      const coord = getTrainLatLng(name);
      matches.push({
        id: `train-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        zone: 'Mumbai Central Line',
        lat: coord.lat,
        lng: coord.lng,
        lines: ['central'],
      });
      if (matches.length >= 8) break;
    }
  }
  return matches;
}

// ─── Generate route cards for a from→to pair ───
export function generateTrainRoutes(fromName, toName, date = null, time = null) {
  const key = `${fromName.toLowerCase()}->${toName.toLowerCase()}`;
  const raw = trainRouteMap.get(key);
  if (!raw || raw.length === 0) return null;

  // Default search time
  const now = new Date();
  const searchTime = time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const travelDate = date || now.toISOString().split('T')[0];

  // Convert "HH:MM" searchTime to minutes
  const [sh, sm] = searchTime.split(':').map(Number);
  const searchMin = sh * 60 + sm;

  // Annotate with offset (next departure from now)
  const withOffset = raw.map(r => {
    const depMin = parseTime(r.dep);
    if (depMin === null) return null;
    let diff = depMin - searchMin;
    if (diff < 0) diff += 1440;
    return { ...r, depMin, diff };
  }).filter(Boolean);

  withOffset.sort((a, b) => a.diff - b.diff);

  const distKm = getDistance(fromName, toName);
  const fare   = calcFare(distKm);
  const speedLabel = { S: 'Slow', F: 'Fast', M: 'Semi-fast' };

  return withOffset.slice(0, 5).map((r, idx) => {
    const depMin = r.depMin;
    const arrMin = parseTime(r.arr);
    let durMin = arrMin !== null ? arrMin - depMin : 30;
    if (durMin < 0) durMin += 1440; // overnight wrap
    const hours = Math.floor(durMin / 60);
    const mins  = durMin % 60;
    const duration = hours > 0 ? `${hours}h ${mins} min` : `${mins} min`;

    const co2Val = Math.round(distKm * 0.01 * 100) / 100;
    const safetyVal = 8.5;
    const comfort = r.speed === 'F' ? 7 : r.speed === 'M' ? 6 : 5;
    const type = speedLabel[r.speed] || r.speed;

    const fromCoord = getTrainLatLng(fromName);
    const toCoord   = getTrainLatLng(toName);

    return {
      id: `train-csv-${idx + 1}`,
      title: `Mumbai Local (${type})`,
      recommended: idx === 0,
      duration,
      durationMin: durMin,
      cost: `₹${fare}`,
      costVal: fare,
      co2: `${co2Val} kg`,
      co2Val,
      safety: `${safetyVal}/10`,
      safetyVal,
      comfort,
      steps: [
        `Board at ${r.from} — Dep: ${r.dep}`,
        `${type} train · ~${Math.round(distKm)} km`,
        `Arrive at ${r.to} — ETA: ${r.arr}`,
      ],
      insight: `Mumbai Central Line — ${type} local train`,
      timeSaved: null,
      modes: ['Train'],
      from: r.from,
      to: r.to,
      waypoints: [
        { name: r.from, ...fromCoord },
        { name: r.to,   ...toCoord  },
      ],
      travelDate,
      departureTime: r.dep,
      arrivalTime:   r.arr,
    };
  });
}
