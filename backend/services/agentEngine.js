// Deterministic agent engine for AI wedding-planning mode.
// Backend owns all state transitions; frontend renders actions.

import { readJSON } from '../utils/jsonStore.js';

const CEREMONY_TYPES = [
  'Hindu Traditional', 'Hindu Vedic', 'Muslim (Nikah)', 'Christian', 'Sikh (Anand Karaj)',
  'Jain', 'Buddhist', 'Parsi (Lagan)', 'Arya Samaj', 'Inter-faith', 'Court Marriage + Reception'
];

const VENDOR_CATEGORIES = ['Photography', 'Decoration', 'Catering', 'Entertainment', 'Bridal Makeup'];

const ACCOMMODATION_OPTIONS = [
  { value: 'hotel block', label: 'Hotel Block', sublabel: 'Reserved rooms in a hotel' },
  { value: 'villa', label: 'Private Villa', sublabel: 'Cozy and intimate (+60%)' },
  { value: 'resort buyout', label: 'Resort Buyout', sublabel: 'Whole resort exclusive (+100%)' },
  { value: 'mixed', label: 'Mixed', sublabel: 'Guests find their own (−20%)' }
];

const accommodationMultiplier = { 'resort buyout': 2.0, 'villa': 1.6, 'hotel block': 1.0, 'mixed': 0.8 };

export function initialState() {
  return {
    phase: 'discovery',
    flowType: null,
    budget: null,
    guestCount: null,
    weddingDate: null,
    daysCount: null,
    vibe: null,
    season: null,
    preferredCountry: null,
    packageId: null,
    destinationId: null,
    venueId: null,
    groomName: null,
    brideName: null,
    weddingType: null,
    accommodation: null,
    selectedVendors: {}, // { category: vendorId }
    vendorCursor: 0
  };
}

// ─── Heuristic free-text parser (fallback when Gemini unavailable) ───
function heuristicParse(text) {
  const out = {};
  const t = text.toLowerCase();
  // budget: "30L", "30 lakh", "2.5cr", "₹40,00,000"
  const lakhMatch = t.match(/(\d+(?:\.\d+)?)\s*l(akh)?s?\b/);
  const crMatch = t.match(/(\d+(?:\.\d+)?)\s*cr(ore)?s?\b/);
  const rupeeMatch = text.match(/₹\s*([\d,]+)/);
  if (crMatch) out.budget = Math.round(parseFloat(crMatch[1]) * 1e7);
  else if (lakhMatch) out.budget = Math.round(parseFloat(lakhMatch[1]) * 1e5);
  else if (rupeeMatch) out.budget = parseInt(rupeeMatch[1].replace(/,/g, ''));

  // guest count: "150 guests", "around 200 people"
  const guestMatch = t.match(/(\d{2,4})\s*(guests?|people|pax|attendees)/);
  if (guestMatch) out.guestCount = parseInt(guestMatch[1]);

  // days
  const dayMatch = t.match(/(\d+)\s*[- ]?days?\b/);
  if (dayMatch) out.daysCount = parseInt(dayMatch[1]);

  // season
  if (/winter|december|january|february/.test(t)) out.season = 'winter';
  else if (/summer|may|june/.test(t)) out.season = 'summer';
  else if (/monsoon|july|august/.test(t)) out.season = 'monsoon';
  else if (/autumn|fall|october|november/.test(t)) out.season = 'autumn';
  else if (/spring|march|april/.test(t)) out.season = 'spring';

  // vibe / style hints
  if (/royal|palace|rajput|maharaja/.test(t)) out.vibe = 'Royal Rajputana';
  else if (/beach|coastal|seaside|goa/.test(t)) out.vibe = 'Beachside Bliss';
  else if (/temple|traditional|south\s*indian/.test(t)) out.vibe = 'Temple Traditional';
  else if (/mountain|hill|himalay/.test(t)) out.vibe = 'Mountain Romance';
  else if (/modern|minimal|chic|contemporary/.test(t)) out.vibe = 'Modern Minimalist';
  else if (/garden|outdoor|floral/.test(t)) out.vibe = 'Garden Elegance';
  else if (/fort|heritage/.test(t)) out.vibe = 'Heritage Fort';
  else if (/boho|bohemian/.test(t)) out.vibe = 'Boho Chic';
  else if (/rustic|farm|country/.test(t)) out.vibe = 'Rustic Charm';
  else if (/tropical|island|exotic/.test(t)) out.vibe = 'Tropical Paradise';

  // country
  if (/india|indian|domestic/.test(t)) out.preferredCountry = 'india';
  else if (/international|abroad|overseas|bali|thailand|dubai|maldives/.test(t)) out.preferredCountry = 'international';

  // wedding date: YYYY-MM-DD
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) out.weddingDate = dateMatch[1];

  return out;
}

async function geminiParse(apiKey, message) {
  try {
    const prompt = `Extract wedding planning info from this user message. Reply ONLY with a JSON object (no markdown). Fields (omit any you cannot extract):
- budget: number (INR, e.g., 3000000 for 30L)
- guestCount: number
- daysCount: number (1, 2, 3, or 5)
- weddingDate: string "YYYY-MM-DD"
- season: one of "winter","summer","monsoon","autumn","spring"
- vibe: general mood/style hint (e.g., "royal", "beach", "garden", "modern", "mountain", "traditional")
- preferredCountry: "india" or "international"
- groomName: string (groom's name if mentioned)
- brideName: string (bride's name if mentioned)
- weddingType: one of "Hindu Traditional","Hindu Vedic","Muslim (Nikah)","Christian","Sikh (Anand Karaj)","Jain","Buddhist","Parsi (Lagan)","Arya Samaj","Inter-faith","Court Marriage + Reception"

User message: """${message}"""

JSON:`;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256, responseMimeType: 'application/json' }
        })
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function parseFreeText(message, apiKey) {
  const heur = heuristicParse(message);
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    const ai = await geminiParse(apiKey, message);
    if (ai) {
      // Merge — heuristic wins on regex-certain fields, AI fills gaps
      return { ...ai, ...Object.fromEntries(Object.entries(heur).filter(([_, v]) => v != null)) };
    }
  }
  return heur;
}

// ─── Ranking helpers ───
function rankPackages(packages, state) {
  const { budget, guestCount, daysCount, vibe, preferredCountry } = state;
  const destinations = readJSON('destinations');
  return packages
    .map(p => {
      let score = 100;
      // Budget proximity
      if (budget) {
        const diff = Math.abs(p.price - budget) / Math.max(budget, p.price);
        score -= Math.min(diff * 80, 80);
        if (p.price > budget * 1.3) score -= 30; // way over
      }
      // Guest count fit
      if (guestCount && p.guestCount) {
        const m = String(p.guestCount).match(/(\d+)\s*-\s*(\d+)/);
        if (m) {
          const lo = parseInt(m[1]), hi = parseInt(m[2]);
          if (guestCount < lo) score -= (lo - guestCount) / lo * 30;
          else if (guestCount > hi) score -= (guestCount - hi) / hi * 50;
        }
      }
      // Days fit
      if (daysCount) {
        const pd = parseInt(p.duration) || 3;
        score -= Math.abs(pd - daysCount) * 10;
      }
      // Vibe/style match in name or description
      if (vibe) {
        const haystack = (p.name + ' ' + (p.description || '')).toLowerCase();
        const vibeWords = vibe.toLowerCase().split(' ');
        if (vibeWords.some(w => haystack.includes(w))) score += 25;
      }
      // Country filter
      if (preferredCountry) {
        const dest = destinations.find(d => d.id === p.destination);
        if (dest) {
          if (preferredCountry === 'india' && dest.isInternational) score -= 25;
          else if (preferredCountry === 'international' && !dest.isInternational) score -= 25;
        }
      }
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.p);
}

function rankDestinations(destinations, state) {
  const { budget, daysCount, vibe, preferredCountry, season } = state;
  const days = daysCount || 3;
  return destinations
    .map(d => {
      let score = 100;
      if (budget) {
        const venueEstimate = d.pricePerDay * days * 1.0; // hotel block baseline
        const ratio = venueEstimate / budget;
        if (ratio > 0.7) score -= (ratio - 0.7) * 100; // venue alone shouldn't exceed 70% of budget
      }
      if (preferredCountry) {
        if (preferredCountry === 'india' && d.isInternational) score -= 40;
        else if (preferredCountry === 'international' && !d.isInternational) score -= 40;
      }
      if (vibe) {
        const haystack = (d.description + ' ' + (d.highlights || []).join(' ')).toLowerCase();
        if (haystack.includes(vibe.toLowerCase().split(' ')[0])) score += 20;
      }
      if (season && d.bestSeason) {
        const month = { winter: ['nov','dec','jan','feb'], summer: ['may','jun'], monsoon: ['jul','aug'], autumn: ['oct','nov'], spring: ['feb','mar','apr'] }[season] || [];
        const best = d.bestSeason.toLowerCase();
        if (month.some(m => best.includes(m))) score += 15;
      }
      return { d, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.d);
}

function rankVendors(vendors, category) {
  return vendors
    .filter(v => v.category === category)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

// ─── Vendor cost (matches CustomFlow logic) ───
function getVendorCost(v, guestCount, days) {
  if (!v || !v.priceRange) return 0;
  const nums = v.priceRange.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return 0;
  const min = parseInt(nums[0].replace(/,/g, ''));
  const max = nums.length > 1 ? parseInt(nums[1].replace(/,/g, '')) : min;
  if (v.category === 'Catering' || v.category === 'Invitations') {
    const perUnit = min + (max - min) * 0.5;
    const cost = Math.round((perUnit * (guestCount || 100)) / 10000) * 10000;
    return Math.max(cost, 10000);
  }
  const dayFactor = Math.min((days || 3) / 3, 2);
  const base = min + (max - min) * 0.35;
  const cost = Math.round((base * dayFactor) / 10000) * 10000;
  return Math.max(min, Math.min(cost, max));
}

function timelineTemplate(days) {
  const t = {
    1: [{ day: 1, events: [{ name: 'Wedding Ceremony & Reception', time: '10:00', venue: '' }] }],
    2: [
      { day: 1, events: [{ name: 'Mehendi & Sangeet', time: '16:00', venue: '' }] },
      { day: 2, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Reception Dinner', time: '19:00', venue: '' }] }
    ],
    3: [
      { day: 1, events: [{ name: 'Haldi Ceremony', time: '10:00', venue: '' }, { name: 'Mehendi Evening', time: '16:00', venue: '' }] },
      { day: 2, events: [{ name: 'Sangeet Night', time: '19:00', venue: '' }] },
      { day: 3, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Grand Reception', time: '19:00', venue: '' }] }
    ],
    5: [
      { day: 1, events: [{ name: 'Welcome Dinner', time: '19:00', venue: '' }] },
      { day: 2, events: [{ name: 'Haldi Ceremony', time: '10:00', venue: '' }] },
      { day: 3, events: [{ name: 'Mehendi Afternoon', time: '14:00', venue: '' }] },
      { day: 4, events: [{ name: 'Sangeet & Cocktail Night', time: '19:00', venue: '' }] },
      { day: 5, events: [{ name: 'Wedding Ceremony', time: '10:00', venue: '' }, { name: 'Reception & After-Party', time: '19:00', venue: '' }] }
    ]
  };
  return t[days] || t[3];
}

function fmtINR(n) {
  if (!n) return '₹0';
  return '₹' + new Intl.NumberFormat('en-IN').format(n);
}

// ─── Build final prefill objects for the flows ───
function buildPackagePrefill(state) {
  return {
    packageId: state.packageId,
    weddingDate: state.weddingDate,
    guestCount: state.guestCount,
    groomName: state.groomName,
    brideName: state.brideName,
    weddingType: state.weddingType,
    accommodation: state.accommodation || 'hotel block',
    fromAgent: true
  };
}

function buildCustomPrefill(state) {
  const vendors = readJSON('vendors');
  const days = state.daysCount || 3;
  const vendorObjects = {};
  for (const [cat, vid] of Object.entries(state.selectedVendors || {})) {
    const v = vendors.find(x => x.id === vid);
    if (v) vendorObjects[cat] = v;
  }
  return {
    destinationId: state.destinationId,
    weddingDate: state.weddingDate,
    daysCount: days,
    guestCount: state.guestCount,
    groomName: state.groomName,
    brideName: state.brideName,
    weddingType: state.weddingType,
    accommodation: state.accommodation || 'hotel block',
    selectedVendors: vendorObjects,
    timeline: timelineTemplate(days),
    fromAgent: true
  };
}

// ─── Phase handlers ───

// Build the recommendation step after we have parsed slots.
function buildRecommendStep(state) {
  const packages = readJSON('packages');
  const ranked = rankPackages(packages, state).slice(0, 3);
  const destinations = readJSON('destinations');
  const getDestName = (id) => destinations.find(d => d.id === id)?.name || '';

  const options = ranked.map(p => ({
    value: 'pkg:' + p.id,
    label: p.name,
    sublabel: `${getDestName(p.destination)} · ${p.duration} · ${fmtINR(p.price)}`,
    image: p.imageUrl,
    meta: p.tier
  }));
  options.push({ value: 'custom', label: 'Plan a custom wedding instead', sublabel: 'Build it your way — destination, style, vendors' });

  const summary = [
    state.budget ? `budget around **${fmtINR(state.budget)}**` : null,
    state.guestCount ? `**${state.guestCount}** guests` : null,
    state.daysCount ? `**${state.daysCount}-day** celebration` : null,
    state.season ? `**${state.season}**` : null,
    state.vibe ? `**${state.vibe}** vibe` : null
  ].filter(Boolean);

  const recap = summary.length
    ? `Got it — ${summary.join(', ')}. Here are my top picks:`
    : `Here are some great options to start with:`;

  return {
    reply: recap,
    action: { type: 'options', options, allowSkip: false },
    state: { ...state, phase: 'recommend' }
  };
}

// ─── Main step function ───
export async function agentStep({ message, state, apiKey }) {
  state = state && state.phase ? { ...state } : initialState();
  const msg = (message || '').trim();
  const lower = msg.toLowerCase();

  // Universal "start over" command
  if (lower === '__reset__' || /^(start over|reset|restart)$/i.test(msg)) {
    state = initialState();
  }

  switch (state.phase) {
    case 'discovery': {
      if (!msg) {
        return {
          reply: "Tell me about your dream wedding! Share whatever's on your mind — vibe, budget, season, guest count. The more you share, the better I can match you.",
          action: { type: 'input', inputType: 'text', placeholder: 'e.g., Royal 3-day wedding in Udaipur for 200 guests, around ₹35L' },
          state
        };
      }
      const parsed = await parseFreeText(msg, apiKey);
      const newState = { ...state, ...parsed };
      // Check if we have enough info to recommend (at least budget or vibe)
      const hasEnoughInfo = newState.budget || newState.vibe || newState.guestCount;
      if (!hasEnoughInfo) {
        return {
          reply: "Thanks! Could you share a bit more? For example — what's your rough budget, preferred vibe (royal, beach, garden, modern…), or guest count? This helps me find the perfect match.",
          action: { type: 'input', inputType: 'text', placeholder: 'e.g., budget around 30L, beach vibe, ~150 guests' },
          state: newState
        };
      }
      // Show a recap and ask if they want to refine or see packages
      const summary = [
        newState.budget ? `budget around **${fmtINR(newState.budget)}**` : null,
        newState.guestCount ? `**${newState.guestCount}** guests` : null,
        newState.daysCount ? `**${newState.daysCount}-day** celebration` : null,
        newState.season ? `**${newState.season}**` : null,
        newState.vibe ? `**${newState.vibe}** vibe` : null
      ].filter(Boolean);
      const recap = `Got it — ${summary.join(', ')}. Shall I show you matching packages, or would you like to refine your preferences further?`;
      return {
        reply: recap,
        action: {
          type: 'options',
          options: [
            { value: 'show_packages', label: 'Show me packages', primary: true },
            { value: 'refine', label: 'Let me refine more' }
          ],
          allowFreeText: true
        },
        state: { ...newState, phase: 'pre_recommend' }
      };
    }

    case 'pre_recommend': {
      if (msg === 'show_packages') {
        return buildRecommendStep(state);
      }
      if (msg === 'refine') {
        return {
          reply: "Sure! Tell me what you'd like to change — budget, vibe, guest count, season, or anything else.",
          action: { type: 'input', inputType: 'text', placeholder: 'e.g., lower budget to 20L, prefer winter' },
          state: { ...state, phase: 'discovery' }
        };
      }
      // Free text — re-parse and stay in discovery or show packages
      const refinedParsed = await parseFreeText(msg, apiKey);
      const refinedState = { ...state, ...refinedParsed };
      return buildRecommendStep(refinedState);
    }

    case 'recommend': {
      if (msg.startsWith('pkg:')) {
        const packages = readJSON('packages');
        const pkg = packages.find(p => p.id === msg.slice(4));
        if (!pkg) {
          return { reply: "Hmm, that package isn't available. Let's try again.", action: null, state: { ...state, phase: 'discovery' } };
        }
        const newState = { ...state, flowType: 'package', packageId: pkg.id };
        // Auto-fill daysCount from package
        const pd = parseInt(pkg.duration) || 3;
        newState.daysCount = pd;
        // What's the next missing field?
        return askNextPackageField(newState, pkg);
      }
      if (msg === 'custom') {
        const newState = { ...state, flowType: 'custom' };
        return askNextCustomField(newState);
      }
      // Treat as further free text — re-parse and re-recommend with updated preferences
      const parsed = await parseFreeText(msg, apiKey);
      const updatedState = { ...state, ...parsed };
      return buildRecommendStep(updatedState);
    }

    // ─── Package path ───
    case 'pkg_date': {
      if (!msg || !/^\d{4}-\d{2}-\d{2}$/.test(msg)) {
        return {
          reply: 'When is the big day?',
          action: { type: 'input', inputType: 'date', field: 'weddingDate', placeholder: 'YYYY-MM-DD' },
          state
        };
      }
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      return askNextPackageField({ ...state, weddingDate: msg }, pkg);
    }
    case 'pkg_guests': {
      const n = parseInt(msg);
      if (!n || n < 10 || n > 2000) {
        return {
          reply: 'About how many guests are you expecting?',
          action: { type: 'input', inputType: 'number', field: 'guestCount', placeholder: 'e.g., 150' },
          state
        };
      }
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      return askNextPackageField({ ...state, guestCount: n }, pkg);
    }
    case 'pkg_accommodation': {
      if (!msg || !ACCOMMODATION_OPTIONS.find(o => o.value === msg)) {
        return {
          reply: 'How would you like to handle accommodation for your guests?',
          action: { type: 'options', options: ACCOMMODATION_OPTIONS.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel })) },
          state
        };
      }
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      return askNextPackageField({ ...state, accommodation: msg }, pkg);
    }
    case 'pkg_names': {
      // Expect "GroomName & BrideName" or just set them
      if (!msg) {
        return {
          reply: "What are the names of the couple? (e.g., Rahul & Priya)",
          action: { type: 'input', inputType: 'text', field: 'coupleNames', placeholder: 'e.g., Rahul & Priya' },
          state
        };
      }
      const parts = msg.split(/\s*[&,]\s*/);
      const groom = parts[0]?.trim() || '';
      const bride = parts[1]?.trim() || '';
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      return askNextPackageField({ ...state, groomName: groom, brideName: bride }, pkg);
    }
    case 'pkg_ceremony': {
      if (!msg || !CEREMONY_TYPES.includes(msg)) {
        return {
          reply: 'What type of ceremony will it be?',
          action: { type: 'options', options: CEREMONY_TYPES.map(t => ({ value: t, label: t })) },
          state
        };
      }
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      return askNextPackageField({ ...state, weddingType: msg }, pkg);
    }
    case 'pkg_confirm': {
      const packages = readJSON('packages');
      const pkg = packages.find(p => p.id === state.packageId);
      if (msg === 'confirm') {
        return {
          reply: `Perfect! Taking you to the **${pkg.name}** review page. You can go back and edit any details before paying.`,
          action: { type: 'navigate', flow: 'package', prefill: buildPackagePrefill(state) },
          state: { ...state, phase: 'done' }
        };
      }
      if (msg === 'edit_manual') {
        return {
          reply: `Opening the package booking flow with your selections pre-filled. You can modify anything there.`,
          action: { type: 'navigate', flow: 'package', prefill: { ...buildPackagePrefill(state), jumpToStep: 1 } },
          state: { ...state, phase: 'done' }
        };
      }
      if (msg === 'start_over') {
        return {
          reply: "No problem! Let's start fresh. Tell me about your dream wedding.",
          action: { type: 'input', inputType: 'text', placeholder: 'e.g., Royal 3-day wedding in Udaipur for 200 guests, around ₹35L' },
          state: initialState()
        };
      }
      if (msg === 'edit') {
        return askNextPackageField({ ...state, weddingDate: null, guestCount: null, accommodation: null }, pkg);
      }
      // Display summary
      return pkgConfirmStep(state, pkg);
    }

    // ─── Custom path ───
    case 'cust_destination': {
      if (msg && msg.startsWith('dest:')) {
        return askNextCustomField({ ...state, destinationId: msg.slice(5) });
      }
      if (msg === 'more') {
        return offerDestinations({ ...state, _showMore: true });
      }
      // Free text — try to match a destination by name/description
      if (msg) {
        const destinations = readJSON('destinations');
        const lower = msg.toLowerCase();
        const matched = destinations.filter(d =>
          d.name.toLowerCase().includes(lower) ||
          (d.city || '').toLowerCase().includes(lower) ||
          (d.country || '').toLowerCase().includes(lower) ||
          (d.description || '').toLowerCase().includes(lower)
        );
        if (matched.length === 1) {
          return askNextCustomField({ ...state, destinationId: matched[0].id });
        }
        if (matched.length > 1) {
          const options = matched.slice(0, 6).map(d => ({
            value: 'dest:' + d.id,
            label: d.name,
            sublabel: `${d.city || d.country} · ${fmtINR(d.pricePerDay)}/day · Best: ${d.bestSeason}`,
            image: d.imageUrl
          }));
          return {
            reply: `I found ${matched.length} destinations matching "${msg}". Pick one:`,
            action: { type: 'options', options, allowFreeText: true },
            state: { ...state, phase: 'cust_destination' }
          };
        }
        // No match — update vibe/preferences and re-show
        const parsed = await parseFreeText(msg, apiKey);
        return offerDestinations({ ...state, ...parsed });
      }
      return offerDestinations(state);
    }
    case 'cust_ceremony': {
      if (msg && CEREMONY_TYPES.includes(msg)) {
        return askNextCustomField({ ...state, weddingType: msg });
      }
      return {
        reply: 'What type of ceremony will it be?',
        action: { type: 'options', options: CEREMONY_TYPES.map(t => ({ value: t, label: t })) },
        state
      };
    }
    case 'cust_names': {
      if (!msg) {
        return {
          reply: "What are the names of the couple? (e.g., Rahul & Priya)",
          action: { type: 'input', inputType: 'text', field: 'coupleNames', placeholder: 'e.g., Rahul & Priya' },
          state
        };
      }
      const parts = msg.split(/\s*[&,]\s*/);
      const groom = parts[0]?.trim() || '';
      const bride = parts[1]?.trim() || '';
      return askNextCustomField({ ...state, groomName: groom, brideName: bride });
    }
    case 'cust_venue': {
      if (msg && msg.startsWith('venue:')) {
        return askNextCustomField({ ...state, venueId: msg.slice(6) });
      }
      if (msg === 'skip_venue') {
        return askNextCustomField({ ...state, venueId: 'skip' });
      }
      return offerVenues(state);
    }
    case 'cust_days': {
      const n = parseInt(msg);
      if ([1, 2, 3, 5].includes(n)) {
        return askNextCustomField({ ...state, daysCount: n });
      }
      return {
        reply: 'How many days will the celebrations span?',
        action: {
          type: 'options',
          options: [
            { value: '1', label: '1 Day', sublabel: 'Ceremony + Reception' },
            { value: '2', label: '2 Days', sublabel: 'Mehendi/Sangeet + Wedding' },
            { value: '3', label: '3 Days', sublabel: 'Full traditional celebration', recommended: true },
            { value: '5', label: '5 Days', sublabel: 'Grand multi-day affair' }
          ]
        },
        state
      };
    }
    case 'cust_date': {
      if (!msg || !/^\d{4}-\d{2}-\d{2}$/.test(msg)) {
        return {
          reply: 'When is your wedding?',
          action: { type: 'input', inputType: 'date', field: 'weddingDate', placeholder: 'YYYY-MM-DD' },
          state
        };
      }
      return askNextCustomField({ ...state, weddingDate: msg });
    }
    case 'cust_guests': {
      const n = parseInt(msg);
      if (!n || n < 10 || n > 2000) {
        return {
          reply: 'About how many guests?',
          action: { type: 'input', inputType: 'number', field: 'guestCount', placeholder: 'e.g., 150' },
          state
        };
      }
      return askNextCustomField({ ...state, guestCount: n });
    }
    case 'cust_accommodation': {
      if (!msg || !ACCOMMODATION_OPTIONS.find(o => o.value === msg)) {
        return {
          reply: 'How would you like to handle accommodation?',
          action: { type: 'options', options: ACCOMMODATION_OPTIONS.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel })) },
          state
        };
      }
      return askNextCustomField({ ...state, accommodation: msg });
    }
    case 'cust_vendors': {
      const cat = VENDOR_CATEGORIES[state.vendorCursor || 0];
      if (msg && msg.startsWith('v:')) {
        const next = { ...state, selectedVendors: { ...state.selectedVendors, [cat]: msg.slice(2) }, vendorCursor: (state.vendorCursor || 0) + 1 };
        return askNextCustomField(next);
      }
      if (msg === 'skip') {
        return askNextCustomField({ ...state, vendorCursor: (state.vendorCursor || 0) + 1 });
      }
      if (msg === 'skip_all_vendors') {
        return askNextCustomField({ ...state, vendorCursor: VENDOR_CATEGORIES.length });
      }
      return offerVendors(state, cat);
    }
    case 'cust_confirm': {
      if (msg === 'confirm') {
        const destinations = readJSON('destinations');
        const dest = destinations.find(d => d.id === state.destinationId);
        return {
          reply: `Beautiful! Taking you to the **${dest?.name || 'your custom wedding'}** review page. You can go back and edit any details before paying.`,
          action: { type: 'navigate', flow: 'custom', prefill: buildCustomPrefill(state) },
          state: { ...state, phase: 'done' }
        };
      }
      if (msg === 'edit_manual') {
        return {
          reply: `Opening the custom wedding flow with your selections pre-filled. You can modify anything there.`,
          action: { type: 'navigate', flow: 'custom', prefill: { ...buildCustomPrefill(state), jumpToStep: 1 } },
          state: { ...state, phase: 'done' }
        };
      }
      if (msg === 'start_over') {
        return {
          reply: "No problem! Let's start fresh. Tell me about your dream wedding.",
          action: { type: 'input', inputType: 'text', placeholder: 'e.g., Royal 3-day wedding in Udaipur for 200 guests, around ₹35L' },
          state: initialState()
        };
      }
      if (msg === 'edit') {
        return askNextCustomField({ ...state, weddingDate: null, guestCount: null, accommodation: null, selectedVendors: {}, vendorCursor: 0 });
      }
      return custConfirmStep(state);
    }

    case 'done':
    default:
      return {
        reply: "We've completed your booking plan. Click **Start Over** to plan another wedding!",
        action: { type: 'reset' },
        state
      };
  }
}

// ─── Per-flow ask-next helpers ───
function askNextPackageField(state, pkg) {
  if (!state.groomName || !state.brideName) return {
    reply: `Great choice — **${pkg.name}** (${fmtINR(pkg.price)}). What are the names of the couple?`,
    action: { type: 'input', inputType: 'text', field: 'coupleNames', placeholder: 'e.g., Rahul & Priya' },
    state: { ...state, phase: 'pkg_names' }
  };
  if (!state.weddingType) return {
    reply: `Lovely! What type of ceremony will ${state.groomName} & ${state.brideName} have?`,
    action: { type: 'options', options: CEREMONY_TYPES.map(t => ({ value: t, label: t })) },
    state: { ...state, phase: 'pkg_ceremony' }
  };
  if (!state.weddingDate) return {
    reply: `When's the big day?`,
    action: { type: 'input', inputType: 'date', field: 'weddingDate', placeholder: 'YYYY-MM-DD' },
    state: { ...state, phase: 'pkg_date' }
  };
  if (!state.guestCount) {
    // Suggest range from package
    const m = String(pkg.guestCount || '').match(/(\d+)\s*-\s*(\d+)/);
    const hint = m ? ` (this package fits ${m[1]}–${m[2]} guests)` : '';
    return {
      reply: `How many guests are you expecting?${hint}`,
      action: { type: 'input', inputType: 'number', field: 'guestCount', placeholder: 'e.g., 150' },
      state: { ...state, phase: 'pkg_guests' }
    };
  }
  if (!state.accommodation) return {
    reply: 'How would you like to handle accommodation for your guests?',
    action: { type: 'options', options: ACCOMMODATION_OPTIONS.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel })) },
    state: { ...state, phase: 'pkg_accommodation' }
  };
  // All filled → confirm
  return pkgConfirmStep(state, pkg);
}

function pkgConfirmStep(state, pkg) {
  const destinations = readJSON('destinations');
  const dest = destinations.find(d => d.id === pkg.destination);
  const gst = Math.round(pkg.price * 0.18);
  const total = pkg.price + gst;
  const text = `Here's your plan:

- **Couple:** ${state.groomName} & ${state.brideName}
- **Ceremony:** ${state.weddingType || 'Not specified'}
- **Package:** ${pkg.name}
- **Destination:** ${dest?.name || 'TBD'}
- **Date:** ${state.weddingDate}
- **Guests:** ~${state.guestCount}
- **Duration:** ${pkg.duration}
- **Accommodation:** ${state.accommodation}
- **Base price:** ${fmtINR(pkg.price)}
- **GST (18%):** ${fmtINR(gst)}
- **Estimated total:** **${fmtINR(total)}**

Ready to proceed? You'll be able to review and edit details on the next page before paying.`;
  return {
    reply: text,
    action: {
      type: 'options',
      options: [
        { value: 'confirm', label: '✓ Proceed to Payment', primary: true },
        { value: 'edit_manual', label: '✏ Edit Manually', sublabel: 'Open the booking flow with your selections pre-filled' },
        { value: 'start_over', label: 'Start Over' }
      ]
    },
    state: { ...state, phase: 'pkg_confirm' }
  };
}

function askNextCustomField(state) {
  if (!state.destinationId) return offerDestinations(state);
  if (!state.venueId) return offerVenues(state);
  if (!state.groomName || !state.brideName) return {
    reply: "What are the names of the couple?",
    action: { type: 'input', inputType: 'text', field: 'coupleNames', placeholder: 'e.g., Rahul & Priya' },
    state: { ...state, phase: 'cust_names' }
  };
  if (!state.weddingType) return {
    reply: `What type of ceremony will ${state.groomName} & ${state.brideName} have?`,
    action: { type: 'options', options: CEREMONY_TYPES.map(t => ({ value: t, label: t })) },
    state: { ...state, phase: 'cust_ceremony' }
  };
  if (!state.daysCount) return {
    reply: 'How many days will the celebrations span?',
    action: {
      type: 'options',
      options: [
        { value: '1', label: '1 Day', sublabel: 'Ceremony + Reception' },
        { value: '2', label: '2 Days', sublabel: 'Mehendi/Sangeet + Wedding' },
        { value: '3', label: '3 Days', sublabel: 'Full traditional celebration', recommended: true },
        { value: '5', label: '5 Days', sublabel: 'Grand multi-day affair' }
      ]
    },
    state: { ...state, phase: 'cust_days' }
  };
  if (!state.weddingDate) return {
    reply: 'When is your wedding?',
    action: { type: 'input', inputType: 'date', field: 'weddingDate', placeholder: 'YYYY-MM-DD' },
    state: { ...state, phase: 'cust_date' }
  };
  if (!state.guestCount) return {
    reply: 'About how many guests?',
    action: { type: 'input', inputType: 'number', field: 'guestCount', placeholder: 'e.g., 150' },
    state: { ...state, phase: 'cust_guests' }
  };
  if (!state.accommodation) return {
    reply: 'How would you like to handle accommodation?',
    action: { type: 'options', options: ACCOMMODATION_OPTIONS.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel })) },
    state: { ...state, phase: 'cust_accommodation' }
  };
  // Vendor selection — one category at a time
  const cursor = state.vendorCursor || 0;
  if (cursor < VENDOR_CATEGORIES.length) {
    return offerVendors({ ...state, phase: 'cust_vendors' }, VENDOR_CATEGORIES[cursor]);
  }
  // Need at least one vendor for booking validity
  if (Object.keys(state.selectedVendors || {}).length === 0) {
    // Force re-pick the first category
    return offerVendors({ ...state, phase: 'cust_vendors', vendorCursor: 0 }, VENDOR_CATEGORIES[0]);
  }
  return custConfirmStep(state);
}

function offerDestinations(state) {
  const destinations = readJSON('destinations');
  const ranked = rankDestinations(destinations, state);
  const showMore = state._showMore;
  const shown = ranked.slice(0, showMore ? 12 : 6);
  const options = shown.map(d => ({
    value: 'dest:' + d.id,
    label: d.name,
    sublabel: `${d.city || d.country} · ${fmtINR(d.pricePerDay)}/day · Best: ${d.bestSeason}`,
    image: d.imageUrl
  }));
  if (!showMore && ranked.length > 6) {
    options.push({ value: 'more', label: 'Show more destinations →' });
  }
  return {
    reply: 'Pick a destination for your wedding, or tell me what you\'re looking for and I\'ll narrow it down:',
    action: { type: 'options', options, allowFreeText: true },
    state: { ...state, phase: 'cust_destination', _showMore: false }
  };
}

function offerVenues(state) {
  const destinations = readJSON('destinations');
  const dest = destinations.find(d => d.id === state.destinationId);
  if (!dest || !dest.subPlaces || dest.subPlaces.length === 0) {
    // No venues available, skip
    return askNextCustomField({ ...state, venueId: 'skip' });
  }
  const options = dest.subPlaces.slice(0, 6).map(v => ({
    value: 'venue:' + v.name,
    label: v.name,
    sublabel: `${v.type || 'Venue'}${v.capacity ? ` · Up to ${v.capacity} guests` : ''}${v.pricePerDay ? ` · ${fmtINR(v.pricePerDay)}/day` : ''}`
  }));
  options.push({ value: 'skip_venue', label: 'Skip — I\'ll choose a venue later' });
  return {
    reply: `Great choice — **${dest.name}**! Here are the available venues. Pick one:`,
    action: { type: 'options', options, allowFreeText: false },
    state: { ...state, phase: 'cust_venue' }
  };
}

function offerVendors(state, category) {
  const vendors = readJSON('vendors');
  const top = rankVendors(vendors, category).slice(0, 3);
  const cursor = state.vendorCursor || 0;
  const remaining = VENDOR_CATEGORIES.length - cursor - 1;
  const options = top.map(v => ({
    value: 'v:' + v.id,
    label: v.name,
    sublabel: `★ ${v.rating} · ${v.city} · ${v.priceRange}`,
    meta: v.specialties?.slice(0, 2).join(', ')
  }));
  options.push({ value: 'skip', label: `Skip ${category}` });
  if (remaining > 0) {
    options.push({ value: 'skip_all_vendors', label: 'Skip all remaining vendors' });
  }
  return {
    reply: `**${category}** — pick a vendor${remaining > 0 ? ` (${remaining} more categor${remaining === 1 ? 'y' : 'ies'} after this)` : ''}:`,
    action: { type: 'options', options },
    state: { ...state, phase: 'cust_vendors' }
  };
}

function custConfirmStep(state) {
  const destinations = readJSON('destinations');
  const vendors = readJSON('vendors');
  const dest = destinations.find(d => d.id === state.destinationId);
  const days = state.daysCount || 3;
  const venueCost = Math.round((dest?.pricePerDay || 0) * days * (accommodationMultiplier[state.accommodation] || 1));
  let vendorsCost = 0;
  const vendorLines = [];
  for (const [cat, vid] of Object.entries(state.selectedVendors || {})) {
    const v = vendors.find(x => x.id === vid);
    if (v) {
      const c = getVendorCost(v, state.guestCount, days);
      vendorsCost += c;
      vendorLines.push(`  • ${cat}: **${v.name}** — ${fmtINR(c)}`);
    }
  }
  const subtotal = venueCost + vendorsCost;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const venueName = state.venueId && state.venueId !== 'skip' ? state.venueId : null;
  const text = `Here's your custom wedding plan:

- **Couple:** ${state.groomName} & ${state.brideName}
- **Ceremony:** ${state.weddingType || 'Not specified'}
- **Destination:** ${dest?.name || 'TBD'}${venueName ? `\n- **Venue:** ${venueName}` : ''}
- **Date:** ${state.weddingDate}
- **Duration:** ${days} day${days > 1 ? 's' : ''}
- **Guests:** ~${state.guestCount}
- **Accommodation:** ${state.accommodation}
- **Venue cost:** ${fmtINR(venueCost)}

**Vendors:**
${vendorLines.length ? vendorLines.join('\n') : '  (none selected)'}

- **Subtotal:** ${fmtINR(subtotal)}
- **GST (18%):** ${fmtINR(gst)}
- **Estimated total:** **${fmtINR(total)}**

Ready to proceed? You'll be able to review and edit details on the next page before paying.`;
  return {
    reply: text,
    action: {
      type: 'options',
      options: [
        { value: 'confirm', label: '✓ Proceed to Payment', primary: true },
        { value: 'edit_manual', label: '✏ Edit Manually', sublabel: 'Open the booking flow with your selections pre-filled' },
        { value: 'start_over', label: 'Start Over' }
      ]
    },
    state: { ...state, phase: 'cust_confirm' }
  };
}
