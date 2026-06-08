# Chapter 7: AI & Special Features

## 7.1 AI Chat – Ask Mode (Gemini Integration)

### Overview:
The Ask Mode provides a free-form conversational interface where users can inquire about any aspect of the platform — destinations, packages, vendors, pricing, wedding planning tips — and receive AI-generated responses with actionable links.

### System Architecture:

```
User Message
    │
    ▼
┌──────────────────────────────────────────────────┐
│              Context Injection                     │
│  • All destinations (name, price, highlights)    │
│  • All packages (name, tier, price, includes)    │
│  • All vendors (name, category, rating, price)   │
│  • User's existing bookings (if authenticated)   │
│  • Platform capabilities description             │
└──────────────────────────┬───────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────┐
│           Google Gemini 2.5 Flash                 │
│  Model: gemini-2.5-flash                         │
│  Temperature: default (creative responses)       │
│  System Prompt: Wedding concierge personality    │
└──────────────────────────┬───────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────┐
│           Response Processing                     │
│  • Markdown formatting                           │
│  • pp:// action link injection                   │
│  • History update (max 50 messages)              │
└──────────────────────────────────────────────────┘
```

### System Prompt Highlights:
- Personality: Friendly, knowledgeable wedding concierge named "Paradise Guide"
- Formatting rules: Bold for names/prices, numbered lists for options, INR formatting (₹25,00,000)
- Action links: Embed `pp://package/<id>`, `pp://destination/<id>`, `pp://custom`, `pp://gallery` links
- Context awareness: Refers to actual platform data (not hallucinated information)
- Scope boundaries: Only answers wedding/platform related queries

### Example Interaction:

**User**: "What are some good beach destinations for a wedding under 20 lakhs?"

**AI Response**:
> Here are some beautiful beach destinations within your budget:
>
> 1. **Goa** - ₹1,20,000/day | Best: November to February
>    - Stunning beachfront venues, vibrant atmosphere
>    - [Explore Goa →](pp://destination/dest-3)
>
> 2. **Kerala (Kovalam)** - ₹95,000/day | Best: October to March
>    - Serene backwaters, coconut groves, traditional ceremonies
>    - [Explore Kerala →](pp://destination/dest-5)
>
> Would you like me to show packages for any of these? Or [start planning a custom beach wedding →](pp://custom)

---

## 7.2 AI Agent – Guided Workflow State Machine

### Overview:
The Agent Mode is a sophisticated guided workflow that conducts a structured conversation to understand user preferences and produce personalized wedding recommendations. It implements a finite state machine with Gemini AI handling natural language parsing.

### How It Works:

**Phase 1 – Discovery**:
- Agent asks: "Tell me about your dream wedding! What's your budget, preferred vibe, guest count, and when are you thinking?"
- User responds naturally: "We're thinking maybe a royal-themed wedding in Rajasthan, around 200 guests, budget of 30 lakhs, sometime in December, 3 days"
- Gemini extracts structured data using JSON mode (temperature: 0.1 for accuracy):

```json
{
  "budget": 3000000,
  "vibe": "royal",
  "guestCount": 200,
  "season": "winter",
  "days": 3,
  "country": "India",
  "dates": "December"
}
```

**Phase 2 – Pre-Recommend (Recap)**:
- Agent presents: "Here's what I understood: Royal wedding, 200 guests, ₹30L budget, December, 3 days. Want me to show matching packages or would you like to refine?"
- User can confirm or adjust

**Phase 3 – Recommend**:
- Runs ranking algorithm on all packages
- Presents top 3 matches with scores and reasons
- Offers custom flow as alternative

**Phase 4+ – Path Execution**:
- Package Path: Collects date, guests, accommodation → navigates to booking
- Custom Path: Collects destination, style, days, date, guests, accommodation, vendors → navigates to custom flow

### Ranking Algorithm:

```
Score = (budgetScore × 0.35) + (guestScore × 0.25) + (durationScore × 0.15) 
      + (vibeScore × 0.15) + (countryScore × 0.10)

Where:
  budgetScore = 1 - |pkg.price - userBudget| / userBudget  (clamped 0-1)
  guestScore  = 1 - |pkg.maxGuests - userGuests| / userGuests  (clamped 0-1)
  durationScore = 1 if days match, 0.5 if ±1 day, 0 otherwise
  vibeScore   = keyword overlap between vibe and package name/description
  countryScore = 1 if country preference matches, 0.5 otherwise
```

---

## 7.3 Smart Parsing Engine

### Gemini-Based Parsing:
For preference extraction, Gemini is called with:
- Temperature: 0.1 (low creativity, high accuracy)
- Response format: JSON
- System instruction: Strict JSON schema with field definitions

### Fallback Heuristic Parser:
When Gemini is unavailable (API key missing, rate limited, network error), a regex-based parser activates:

```javascript
// Budget parsing
"30L" or "30 lakh" → 3000000
"₹25,00,000" → 2500000
"50 lakhs" → 5000000

// Guest count
"200 guests" or "for 200" → 200

// Days
"3 day" or "3-day" → 3

// Season
"winter" or "december" or "january" → "winter"
"summer" or "april" or "may" → "summer"

// Vibe
"royal" or "rajputana" or "palace" → "royal"
"beach" or "seaside" or "coastal" → "beach"
"garden" or "outdoor" or "nature" → "garden"
```

This ensures the agent continues functioning even without AI connectivity.

---

## 7.4 AI Timeline Generation

### Feature:
Automatically generates multi-day wedding timelines with appropriate events, timing, and venue suggestions.

### Input Parameters:
- `days`: Number of wedding days (1-5)
- `style`: Wedding style (Royal Rajputana, Beachside Bliss, etc.)
- `guestCount`: Number of guests
- `destination`: Destination name
- `notes`: Optional custom requirements

### Output Format:
```json
[
  {
    "day": 1,
    "title": "Welcome & Mehendi",
    "events": [
      { "time": "10:00 AM", "event": "Guest Welcome & Breakfast", "venue": "Hotel Lobby" },
      { "time": "2:00 PM", "event": "Mehendi Ceremony", "venue": "Garden Pavilion" },
      { "time": "7:00 PM", "event": "Welcome Dinner & Sangeet", "venue": "Poolside Deck" }
    ]
  },
  {
    "day": 2,
    "title": "Haldi & Main Ceremony",
    "events": [
      { "time": "9:00 AM", "event": "Haldi Ceremony", "venue": "Courtyard" },
      { "time": "4:00 PM", "event": "Baraat Procession", "venue": "Main Entrance" },
      { "time": "6:00 PM", "event": "Wedding Ceremony", "venue": "Grand Ballroom" },
      { "time": "8:30 PM", "event": "Reception & Dinner", "venue": "Banquet Hall" }
    ]
  }
]
```

### Generation Logic:
1. Construct prompt with all parameters
2. Call Gemini with structured output instruction
3. Parse JSON from response (handle markdown code block wrapping)
4. Validate structure (array of days with events)
5. Return to frontend for display in timeline builder

---

## 7.5 Custom Protocol Links (pp://)

### Innovation:
Promise Paradise implements a custom URI protocol (`pp://`) that enables AI responses to contain clickable deep-links to platform features.

### Supported Routes:

| Protocol URL | Frontend Route | Purpose |
|-------------|---------------|---------|
| `pp://package/<id>` | `/book-package/<id>` | Jump to specific package booking |
| `pp://destination/<id>` | Scroll to destination | View destination details |
| `pp://packages` | `/explore-packages` | Browse all packages |
| `pp://custom` | `/plan-wedding` | Start custom wedding flow |
| `pp://gallery` | `/wedding-gallery` | View wedding gallery |
| `pp://bookings` | `/my-weddings` | View user's bookings |
| `pp://concierge` | `/wedding-concierge` | Open AI assistant |

### Implementation:
- AI system prompt instructs Gemini to embed these links in markdown format
- Frontend `markdownRenderer.jsx` intercepts `pp://` links and converts to React Router navigation
- Example rendering: `[Explore Goa →](pp://destination/dest-3)` → clickable link navigating to destination

### Why Custom Protocol:
- Standard HTTP links would navigate away from the SPA
- `pp://` clearly indicates in-app navigation
- AI can generate contextually appropriate action links
- Creates seamless conversation-to-action UX

---

## 7.6 JSON Fallback – Zero-Database Mode

### Innovation:
Promise Paradise can function as a complete application **without any database server**, automatically detecting MongoDB unavailability and switching to file-based storage.

### Detection Logic:

```
Server Startup
    │
    ├── MONGODB_URI not set? ─────────────────▶ JSON Fallback Mode
    │
    ├── MONGODB_URI = 'YOUR_MONGO_URI_HERE'? ──▶ JSON Fallback Mode
    │
    ├── MongoDB connection attempt fails? ─────▶ JSON Fallback Mode
    │
    └── Connection successful ─────────────────▶ MongoDB Mode
```

### JSON Store Implementation:

```javascript
// utils/jsonStore.js
const DATA_DIR = path.resolve(__dirname, '..', 'data');

export function readJSON(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  // Handle BOM character
  const clean = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(clean);
}

export function writeJSON(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
```

### Data Files:

| File | Records | Purpose |
|------|---------|---------|
| destinations.json | 50+ | All destination data |
| packages.json | 20+ | Wedding packages |
| vendors.json | 80+ | Vendor marketplace |
| users.json | Dynamic | User accounts |
| bookings.json | Dynamic | All bookings |
| chats.json | Dynamic | AI chat history |
| payments.json | Dynamic | Payment records |

### Benefits:
1. **Zero Setup**: Clone repo → `npm start` → working application
2. **Developer Friendly**: New contributors start immediately
3. **Portable**: Entire dataset is human-readable JSON
4. **Resilient**: App continues working if database goes down
5. **Demo Ready**: Perfect for presentations and demos without infrastructure

### Limitations (documented in startup banner):
- No ACID transactions
- No concurrent write safety
- No advanced queries/aggregations
- Not suitable for production with many concurrent users
- File I/O slower than database for large datasets

### Health Check Endpoint:
```
GET /api/health
Response: { "status": "ok", "mode": "JSON Fallback", "timestamp": "2026-05-23T..." }
```

---

## 7.7 Dynamic Cost Calculator

### Innovation:
Real-time cost calculation that updates as users make selections in the Custom Flow.

### Formula:

```
┌─────────────────────────────────────────────────────────────┐
│                    COST BREAKDOWN                             │
├──────────────────────────────┬──────────────────────────────┤
│ Base Venue Cost              │ pricePerDay × days × accomMul│
│ Vendor: Photography          │ (min+(max-min)*0.35) × dayF  │
│ Vendor: Catering             │ (min+(max-min)*0.5) × guests │
│ Vendor: Decoration           │ (min+(max-min)*0.35) × dayF  │
│ Vendor: Entertainment        │ (min+(max-min)*0.35) × dayF  │
│ ...                          │                              │
├──────────────────────────────┤──────────────────────────────┤
│ Subtotal                     │ base + Σ vendors             │
│ GST (18%)                    │ subtotal × 0.18             │
│ TOTAL                        │ subtotal + GST              │
└──────────────────────────────┴──────────────────────────────┘

Accommodation Multipliers:
  Hotel Block:   1.0x (standard)
  Mixed:         0.8x (most economical)
  Villa:         1.6x (premium)
  Resort Buyout: 2.0x (exclusive)
```

---

## 7.8 Guest Management System

### Features:
- Add unlimited guests with detailed info
- Fields: Name, Email, Phone, RSVP status, Plus One, Dietary preferences, Accommodation needs
- Edit guests post-booking (editable field)
- Send email invitations to individual guests
- RSVP tracking (Pending, Accepted, Declined)

### Email Invitation:
Guests receive beautifully formatted HTML emails with:
- Couple names and wedding date
- Destination and venue details
- Personalized greeting
- Event schedule highlights
- RSVP instructions

---
