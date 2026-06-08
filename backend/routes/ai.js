import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getBookingsByUser } from '../dal/bookings.js';
import { getUserChats, appendChat, clearUserChats, getAgentState, setAgentState, clearAgentState } from '../dal/chats.js';
import { readJSON } from '../utils/jsonStore.js';
import { agentStep, initialState } from '../services/agentEngine.js';

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
}

const router = Router();

const SYSTEM_PROMPT = `You are the Promise Paradise wedding concierge AI assistant. You help users plan their dream destination wedding.

Your responsibilities:
- Recommend destinations based on preferences (budget, season, style, guest count)
- Suggest and compare wedding packages with pricing
- Recommend vendors by category (photography, catering, decor, etc.)
- Help plan event timelines (mehendi, sangeet, wedding, reception)
- Answer questions about pricing, availability, and logistics
- Guide users through the booking process on our platform

FORMATTING RULES (very important - our UI renders markdown):
- Use **bold** for names of packages, destinations, vendors, and key figures (e.g., **Royal Rajputana**, **INR 25,00,000**).
- Use plain newlines and numbered lists (1. 2. 3.) for structure.
- Always quote prices in INR using Indian number format (e.g., INR 25,00,000).
- Keep responses concise - 2 to 3 short paragraphs or a short list, not walls of text.

INLINE ACTION LINKS (CRITICAL - these are how the user navigates):
When you mention a specific package, destination, vendor category, or feature, embed clickable links inline in the sentence using markdown link syntax with our internal "pp://" URL scheme. NEVER list these links at the bottom - they MUST be inline inside the prose.

Use exactly these link formats:
- A specific package: [Package Name](pp://package/<id>)  e.g. "Try [Royal Rajputana](pp://package/pkg-1) for a regal vibe."
- A specific destination: [Destination Name](pp://destination/<id>) e.g. "[Udaipur](pp://destination/dest-1) is perfect for winter."
- Browse all packages: [browse our packages](pp://packages)
- Plan a custom wedding: [plan a custom wedding](pp://custom)
- View gallery: [our gallery](pp://gallery)
- View bookings: [your bookings](pp://bookings)

When recommending, give 2 to 3 options with brief pros, and embed the package/destination links inline so the user can click straight through.

Use the provided context data for accurate pricing, IDs, and details. NEVER invent packages, destinations, or IDs that are not in the data. If you do not have enough information, ask the user a short follow-up question.`;

function buildContextInfo(userBookings) {
  const destinations = readJSON('destinations');
  const packages = readJSON('packages');
  const vendors = readJSON('vendors');
  return `
=== DESTINATIONS ===
${JSON.stringify(destinations.map(d => ({
  id: d.id, name: d.name, city: d.city, country: d.country,
  pricePerDay: d.pricePerDay, bestSeason: d.bestSeason, maxGuests: d.maxGuests,
  description: d.description, highlights: d.highlights
})), null, 1)}

=== PACKAGES ===
${JSON.stringify(packages.map(p => ({
  id: p.id, name: p.name, basePrice: p.basePrice, price: p.price,
  durationDays: p.durationDays, duration: p.duration, guestCapacity: p.guestCapacity,
  destinationId: p.destinationId, tier: p.tier, includes: p.includes, description: p.description
})), null, 1)}

=== VENDORS (by category) ===
${JSON.stringify(vendors.map(v => ({
  id: v.id, name: v.name, category: v.category, city: v.city,
  priceRange: v.priceRange, rating: v.rating, specialties: v.specialties
})), null, 1)}

=== USER'S CURRENT BOOKINGS ===
${JSON.stringify((userBookings || []).filter(b => b.status !== 'cancelled').map(b => ({
  id: b.id, type: b.type, destination: b.destinationId, status: b.status,
  weddingDate: b.dates?.wedding, guestCount: b.guestCount
})))}
`;
}

async function callGemini(apiKey, contents) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 }
      })
    }
  );
  if (!response.ok) {
    const errData = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errData}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I could not process that request. Please try again.';
}

router.get('/chats', optionalAuth, (req, res) => {
  const mode = (req.query.mode || 'ask').toString();
  if (!req.user) return res.json({ messages: [] });
  res.json({ messages: getUserChats(req.user.id, mode) });
});

router.delete('/chats', optionalAuth, (req, res) => {
  const mode = req.query.mode ? req.query.mode.toString() : null;
  if (req.user) clearUserChats(req.user.id, mode);
  res.json({ ok: true });
});

router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, history, regenerate } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({ error: 'AI service not configured. Please set GEMINI_API_KEY in .env' });
    }

    const userBookings = req.user ? await getBookingsByUser(req.user.id) : [];
    const contextInfo = buildContextInfo(userBookings);

    const conversationHistory = (history || []).slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nHere is the real-time data from our platform:\n' + contextInfo + '\n\nRespond helpfully to the user.' }] },
      { role: 'model', parts: [{ text: 'Understood! I have all the destination, package, and vendor information loaded. I will use **bold** for emphasis and embed inline pp:// links for packages and destinations. What would you like to know?' }] },
      ...conversationHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    const reply = await callGemini(apiKey, contents);

    if (req.user) {
      const ts = Date.now();
      const toSave = regenerate
        ? [{ role: 'assistant', content: reply, ts }]
        : [
            { role: 'user', content: message, ts },
            { role: 'assistant', content: reply, ts: ts + 1 }
          ];
      appendChat(req.user.id, 'ask', toSave);
    }

    res.json({ role: 'assistant', content: reply, reply });
  } catch (err) {
    console.error('AI Chat Error:', err.message);
    res.status(500).json({ error: 'AI chat failed.', details: err.message });
  }
});

// POST /api/ai/agent — guided wedding planning state machine
router.post('/agent', optionalAuth, async (req, res) => {
  try {
    const { message = '', state: clientState } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    // Prefer server-stored state for logged-in users, fall back to client state
    let state = clientState;
    if (req.user) {
      const serverState = getAgentState(req.user.id);
      if (serverState) state = serverState;
    }
    if (!state || !state.phase) state = initialState();

    // Detect reset request — also wipes server state
    const isReset = typeof message === 'string' && /^(__reset__|start over|reset|restart)$/i.test(message.trim());
    if (isReset) {
      state = initialState();
      if (req.user) clearAgentState(req.user.id);
    }

    const result = await agentStep({ message, state, apiKey });

    // Persist state + chat turn
    if (req.user) {
      setAgentState(req.user.id, result.state);
      const ts = Date.now();
      const turns = [];
      if (message && !isReset) turns.push({ role: 'user', content: message, ts });
      // Save assistant turn with action attached so we can re-render on reload
      turns.push({ role: 'assistant', content: result.reply, action: result.action || null, ts: ts + 1 });
      if (turns.length) appendChat(req.user.id, 'agent', turns);
    }

    res.json(result);
  } catch (err) {
    console.error('AI Agent Error:', err.message);
    res.status(500).json({ error: 'AI agent failed.', details: err.message });
  }
});

// POST /api/ai/timeline — generate a wedding timeline using AI
router.post('/timeline', optionalAuth, async (req, res) => {
  try {
    const { days, style, guestCount, destination, notes } = req.body;
    const numDays = Number(days) || 3;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const prompt = `You are a professional Indian wedding planner. Generate a detailed ${numDays}-day wedding timeline.

Context:
- Style: ${style || 'Traditional Indian'}
- Guest count: ${guestCount || 150}
- Destination: ${destination || 'India'}
${notes ? `- Special notes: ${notes}` : ''}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
The format must be exactly:
[{"day":1,"events":[{"name":"Event Name","time":"HH:MM","venue":""}]},{"day":2,"events":[...]}]

Rules:
- Each day should have 2-4 events
- Times in 24h format (e.g. "10:00", "19:00")
- Include typical Indian wedding events: Haldi, Mehendi, Sangeet, Baraat, Pheras, Reception etc.
- Spread events logically across days
- Day 1 should be lighter (welcome/pre-wedding), last day should have the main ceremony
- venue field should be empty string ""`;

    const contents = [
      { role: 'user', parts: [{ text: prompt }] }
    ];
    const reply = await callGemini(apiKey, contents);

    // Parse the JSON from the response
    let timeline;
    try {
      // Strip code fences if present
      let cleaned = reply.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
      // Try to extract JSON array from the response
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        timeline = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole cleaned response
        timeline = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.error('Timeline parse error:', parseErr.message, 'Raw:', reply.substring(0, 200));
      // Fallback: generate a basic template
      const numDays = Number(days) || 3;
      const fallbackEvents = {
        1: [{ name: 'Welcome & Mehendi', time: '16:00', venue: '' }, { name: 'Sangeet Night', time: '19:00', venue: '' }],
        2: [{ name: 'Haldi Ceremony', time: '10:00', venue: '' }, { name: 'Wedding Ceremony', time: '18:00', venue: '' }],
        3: [{ name: 'Grand Reception', time: '19:00', venue: '' }]
      };
      timeline = Array.from({ length: numDays }, (_, i) => ({
        day: i + 1,
        events: fallbackEvents[i + 1] || [{ name: `Day ${i + 1} Event`, time: '10:00', venue: '' }]
      }));
    }

    // Validate structure
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return res.status(500).json({ error: 'Invalid timeline generated. Please try again.' });
    }

    // Normalize
    timeline = timeline.map((day, i) => ({
      day: day.day || i + 1,
      events: (day.events || []).map(ev => ({
        name: ev.name || 'Event',
        time: ev.time || '',
        venue: ev.venue || ''
      }))
    }));

    res.json({ timeline, days: timeline.length });
  } catch (err) {
    console.error('AI Timeline Error:', err.message);
    res.status(500).json({ error: 'Timeline generation failed.', details: err.message });
  }
});

export default router;