import Groq from 'groq-sdk';

let groq = null;

export function initGroq(apiKey) {
  groq = new Groq({ apiKey });
  console.log('🤖 Groq AI initialized (llama-3.3-70b-versatile)');
}

// ─── System prompt with the user-defined fare table ───
const FARE_SYSTEM_PROMPT = `You are a travel fare estimation and route recommendation assistant for Mumbai's multimodal transit network.

FARE RATES (use these for all calculations):
- Regular Local Train: ₹1.5/km
- Metro: ₹2.5/km
- Non-AC Bus: ₹2.5/km
- AC Bus: ₹3.5/km
- Ferry: ₹5/km
- Cab/Taxi (Ola/Uber): ₹20/km
- Auto Rickshaw: ₹15/km

FORMULA: Fare = Distance × Rate per km (round to nearest rupee)

RULES:
1. If distance is not provided, estimate it using your knowledge of Mumbai's geography and route distances.
2. Always calculate fares for ALL applicable modes for the given route.
3. Return ONLY valid JSON — no markdown, no explanation text outside the JSON.
4. Keep insight text concise (under 15 words).
5. Actual fares may vary due to fare slabs, surge pricing, and operator policies.`;

// ─── Analyse routes + DNA to produce AI-enriched recommendations ───
export async function analyzeRoutesWithAI(fromName, toName, routes, dnaPreferences) {
  if (!groq) throw new Error('Groq not initialized');

  const { cost = 50, safety = 50, speed = 50, comfort = 50 } = dnaPreferences || {};

  // Build a compact summary of available routes for the prompt
  const routeSummary = routes.map((r, i) => ({
    index: i + 1,
    id: r.id,
    title: r.title,
    modes: r.modes,
    duration: r.duration,
    durationMin: r.durationMin,
    existingCost: r.cost || null,
    co2: r.co2,
    safety: r.safety,
    comfort: r.comfort,
    departure: r.departureTime || null,
    arrival: r.arrivalTime || null,
  }));

  const userPrompt = `Route: ${fromName} → ${toName}

Available transit options:
${JSON.stringify(routeSummary, null, 2)}

User's Commute DNA preferences (scale 0–100, higher = more important):
- Cost sensitivity: ${cost} (${cost > 66 ? 'prefers cheapest' : cost > 33 ? 'moderate' : 'not a priority'})
- Safety priority: ${safety}
- Speed priority: ${speed}  
- Comfort priority: ${comfort}

Tasks:
1. For each route, estimate the fare using the rate table (if not already provided).
2. Rank the routes based on the user's DNA preferences.
3. Give a short AI insight for the top recommended route.
4. Provide a one-line fare disclaimer.

Return ONLY this JSON structure:
{
  "rankedRouteIds": ["id1", "id2", ...],
  "fareEstimates": {
    "routeId": { "estimated": true, "cost": "₹X", "costVal": X, "breakdown": "Xkm × ₹Y/km" }
  },
  "topInsight": "Short reason why route X is recommended for this user",
  "disclaimer": "Actual fares may vary due to surge pricing and operator policies.",
  "distanceKm": X
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: FARE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Simple fare-only estimate for a route (no full route objects needed) ───
export async function estimateFaresForRoute(fromName, toName, distanceKm = null) {
  if (!groq) throw new Error('Groq not initialized');

  const distanceClause = distanceKm
    ? `The distance is ${distanceKm} km.`
    : `Distance is unknown — estimate it from your knowledge of Mumbai's geography.`;

  const userPrompt = `Route: ${fromName} → ${toName}. ${distanceClause}

Calculate estimated fares for all transport modes and return ONLY this JSON:
{
  "distanceKm": X,
  "fares": {
    "Local Train": { "cost": "₹X", "costVal": X },
    "Metro": { "cost": "₹X", "costVal": X },
    "Non-AC Bus": { "cost": "₹X", "costVal": X },
    "AC Bus": { "cost": "₹X", "costVal": X },
    "Ferry": { "cost": "₹X", "costVal": X },
    "Cab": { "cost": "₹X", "costVal": X },
    "Auto": { "cost": "₹X", "costVal": X }
  },
  "disclaimer": "Actual fares may vary."
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: FARE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 512,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
