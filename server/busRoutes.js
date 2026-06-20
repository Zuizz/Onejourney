import fs from 'fs';
import path from 'path';

// Store unique cities and mapped routes in memory
export const busCities = new Set();
export const busRouteMap = new Map();

// Helper to split a CSV line while correctly handling comma inside quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Helper to parse time string (e.g. "09:30:00 PM" or "14:30") to minutes from midnight
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  // Format: "09:30:00 PM" or "09:30 AM"
  const match = timeStr.match(/^(\d+):(\d+)(?::(\d+))?\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const ampm = match[4].toUpperCase();
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }
  
  // Format: "14:30" or "09:15"
  const simpleMatch = timeStr.match(/^(\d+):(\d+)$/);
  if (simpleMatch) {
    const hours = parseInt(simpleMatch[1]) || 0;
    const minutes = parseInt(simpleMatch[2]) || 0;
    return hours * 60 + minutes;
  }
  
  return 0;
}

// Generate deterministic coordinates inside India boundaries: lat [10, 30], lng [72, 85]
export function getDeterministicLatLng(cityName) {
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 10 + (Math.abs(hash) % 200) / 10;
  const lng = 72 + (Math.abs(hash >> 8) % 130) / 10;
  return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) };
}

// Convert "days:hours:minutes" to total minutes
function durationStrToMinutes(durationStr) {
  const parts = durationStr.split(':');
  if (parts.length === 3) {
    const days = parseInt(parts[0]) || 0;
    const hours = parseInt(parts[1]) || 0;
    const mins = parseInt(parts[2]) || 0;
    return days * 24 * 60 + hours * 60 + mins;
  }
  return 60;
}

// Format duration in minutes to user-friendly "Xh Y min" format
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins} min`;
  }
  return `${mins} min`;
}

// Read CSV and load data into memory structures
export function loadBusRoutes() {
  try {
    const csvPath = path.resolve(process.cwd(), 'Datasets', 'Pan-India_Bus_Routes.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️ Bus routes CSV file not found at:', csvPath);
      return;
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n');
    
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = parseCSVLine(line);
      if (parts.length < 8) continue;
      
      const [from, to, operator, distanceStr, durationStr, busType, departure, arrival] = parts;
      
      busCities.add(from);
      busCities.add(to);
      
      const key = `${from.toLowerCase()}->${to.toLowerCase()}`;
      if (!busRouteMap.has(key)) {
        busRouteMap.set(key, []);
      }
      
      busRouteMap.get(key).push({
        from,
        to,
        operator,
        distance: parseInt(distanceStr) || 0,
        durationStr,
        busType,
        departure,
        arrival
      });
      count++;
    }
    
    console.log(`🚀 Loaded ${count} bus routes connecting ${busCities.size} unique cities across India.`);
  } catch (err) {
    console.error('Failed to load bus routes CSV:', err);
  }
}

// Autocomplete matcher for cities parsed from the CSV
export function searchBusStations(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  const matches = [];
  for (const city of busCities) {
    if (city.toLowerCase().includes(q)) {
      const coord = getDeterministicLatLng(city);
      matches.push({
        id: `csv-${city.toLowerCase().replace(/\s+/g, '-')}`,
        name: city,
        zone: 'Pan-India Bus Network',
        lat: coord.lat,
        lng: coord.lng,
        lines: ['bus']
      });
      if (matches.length >= 8) break;
    }
  }
  return matches;
}

// Build standard route objects from the indexed CSV lines, sorted by proximity to search time
export function generateBusRoutes(fromName, toName, defaultStations = [], date = null, time = null) {
  const key = `${fromName.toLowerCase()}->${toName.toLowerCase()}`;
  const rawRoutes = busRouteMap.get(key);
  if (!rawRoutes || rawRoutes.length === 0) return null;
  
  // Set default search time/date if not provided
  const now = new Date();
  const searchTime = time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const travelDate = date || now.toISOString().split('T')[0];
  
  const searchTimeMin = parseTimeToMinutes(searchTime);
  
  // Clone and calculate departure offset for sorting
  const routesWithOffset = rawRoutes.map(r => {
    const depMin = parseTimeToMinutes(r.departure);
    let diff = depMin - searchTimeMin;
    if (diff < 0) {
      diff += 1440; // Wrap around to the next day
    }
    return { ...r, offset: diff };
  });
  
  // Sort by offset ascending (closest departure first)
  routesWithOffset.sort((a, b) => a.offset - b.offset);
  
  return routesWithOffset.slice(0, 5).map((r, index) => {
    const durationMin = durationStrToMinutes(r.durationStr);
    
    const isAC = r.busType.toLowerCase().includes('a/c') || r.busType.toLowerCase().includes('ac');
    const isSleeper = r.busType.toLowerCase().includes('sleeper');
    
    // CO2 calculation
    const co2Val = Math.round(r.distance * 0.06 * 100) / 100;
    
    // Determine safety and comfort ratings
    const safetyVal = Math.round((7.5 + (isAC ? 1.0 : 0) + (r.distance % 10) / 10) * 10) / 10;
    let comfort = 5;
    if (isSleeper) comfort += 2;
    if (isAC) comfort += 2;
    comfort = Math.min(10, comfort);
    
    // Coordinate resolution
    const fromFound = defaultStations.find(s => s.name.toLowerCase() === r.from.toLowerCase());
    const toFound = defaultStations.find(s => s.name.toLowerCase() === r.to.toLowerCase());
    
    const fromWp = fromFound 
      ? { name: fromFound.name, lat: fromFound.lat, lng: fromFound.lng }
      : { name: r.from, ...getDeterministicLatLng(r.from) };
      
    const toWp = toFound
      ? { name: toFound.name, lat: toFound.lat, lng: toFound.lng }
      : { name: r.to, ...getDeterministicLatLng(r.to) };
      
    return {
      id: `bus-csv-${index + 1}`,
      title: `${r.operator} (${r.busType})`,
      recommended: index === 0,
      duration: formatDuration(durationMin),
      durationMin,
      co2: `${co2Val} kg`,
      co2Val,
      safety: `${safetyVal}/10`,
      safetyVal,
      comfort,
      steps: [
        `Board at ${r.from} (Departure: ${r.departure})`,
        `Travel via ${r.operator} — ${r.distance} km`,
        `Arrive at ${r.to} (ETA: ${r.arrival})`
      ],
      insight: isAC ? 'Premium air-conditioned long-distance bus' : 'Direct budget-friendly bus',
      timeSaved: null,
      modes: ['Bus'],
      from: r.from,
      to: r.to,
      waypoints: [fromWp, toWp],
      travelDate,
      departureTime: r.departure,
      arrivalTime: r.arrival
    };
  });
}
