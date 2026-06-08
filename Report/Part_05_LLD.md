# Chapter 5: Low-Level Design (LLD)

## 5.1 Data Models / ER Diagram

### 5.1.1 Entity Relationship Overview

```
┌──────────┐        ┌──────────────┐        ┌─────────────┐
│   User   │───1:N──│   Booking    │───N:1──│ Destination │
│          │        │              │        │             │
│ • id     │        │ • id (PP-XX) │        │ • id        │
│ • name   │        │ • userId     │        │ • name      │
│ • email  │        │ • type       │        │ • country   │
│ • phone  │        │ • status     │        │ • subPlaces │
│ • isAdmin│        │ • dates      │        └─────────────┘
└──────────┘        │ • guests[]   │                │
                    │ • timeline[] │        ┌───────┴───────┐
                    │ • payment{}  │        │               │
                    │ • vendors[]  │   ┌────────────┐  ┌────────┐
                    └──────┬───────┘   │  Package   │  │ Vendor │
                           │           │            │  │        │
                           └───N:1─────│ • id       │  │ • id   │
                           └───N:M─────│ • dest     │  │ • name │
                                       │ • price    │  │ • rate │
                                       │ • tier     │  │ • cat  │
                                       │ • vendors[]│  └────────┘
                                       └────────────┘
```

### 5.1.2 User Model

```javascript
{
  id:           String  // UUID v4, unique
  name:         String  // Required
  email:        String  // Required, unique, lowercase
  passwordHash: String  // bcrypt hash (10 rounds)
  phone:        String  // Optional
  isAdmin:      Boolean // Default: false
  createdAt:    Date    // Auto-generated ISO timestamp
}
```

**Indexes**: email (unique)  
**Constraints**: email required, password minimum 6 characters (validated at route level)

### 5.1.3 Booking Model

```javascript
{
  id:              String    // Format: "PP" + 10 alphanumeric chars
  userId:          String    // FK → User.id
  type:            String    // Enum: "package" | "custom"
  status:          String    // Enum: "pending" | "confirmed" | "cancelled"
  packageId:       String    // FK → Package.id (null for custom)
  destinationId:   String    // FK → Destination.id
  subPlace:        String    // Selected venue name (optional)
  
  dates: {
    wedding:   String  // YYYY-MM-DD format
    checkIn:   String  // YYYY-MM-DD
    checkOut:  String  // YYYY-MM-DD
  }
  
  guestCount:      Number
  accommodation:   String   // "hotel block" | "villa" | "resort buyout" | "mixed"
  style:           String   // Wedding style name
  notes:           String   // Additional notes
  
  selectedVendors: [String] // Array of Vendor IDs
  
  timeline: [{              // Array of day objects
    day:    Number,
    title:  String,
    events: [{
      time:  String,
      event: String,
      venue: String
    }]
  }]
  
  guests: [{                // Array of guest objects
    name:          String,
    email:         String,
    phone:         String,
    rsvp:          String,  // "pending" | "accepted" | "declined"
    plusOne:       Boolean,
    dietary:       String,
    accommodation: String
  }]
  
  totalAmount:     Number   // Calculated total in INR
  
  payment: {
    amount:        Number,
    paidAmount:    Number,  // Default: 0
    status:        String,  // "pending" | "paid" | "partial"
    transactionId: String,
    paidAt:        String,  // ISO timestamp
    method:        String,
    breakdown: {
      basePrice:   Number,
      tax:         Number,
      total:       Number
    },
    history: [{             // Array of payment transactions
      transactionId: String,
      amount:        Number,
      method:        String,
      paymentType:   String,
      paidAt:        String
    }]
  }
  
  editableAfterBooking: [String]  // ["guests", "timeline", "contactInfo"]
  createdAt:       String         // ISO timestamp
}
```

### 5.1.4 Destination Model

```javascript
{
  id:              String   // Format: "dest-N"
  name:            String   // E.g., "Udaipur"
  country:         String   // "India" or international
  city:            String
  imageUrl:        String   // URL to destination image
  description:     String   // Rich description
  climate:         String   // E.g., "Tropical", "Semi-Arid"
  bestSeason:      String   // E.g., "October to March"
  pricePerDay:     Number   // Base cost per day in INR
  isInternational: Boolean
  highlights:      [String] // Array of selling points
  subPlaces: [{             // Array of venue options
    name:        String,
    type:        String,    // "Palace", "Beach", "Resort", etc.
    capacity:    Number,    // Max guests
    description: String
  }]
}
```

### 5.1.5 Package Model

```javascript
{
  id:          String   // Format: "pkg-N"
  name:        String   // Package name
  destination: String   // FK → Destination.id
  imageUrl:    String
  description: String
  duration:    String   // "1 days", "2 days", "3 days", etc.
  guestCount:  String   // "100-250" or single number
  price:       Number   // Total price in INR
  tier:        String   // "budget" | "standard" | "premium" | "luxury"
  includes:    [String] // Services included
  vendors:     [String] // Vendor IDs included in package
}
```

### 5.1.6 Vendor Model

```javascript
{
  id:          String    // Format: "v-N"
  name:        String
  category:    String    // One of 10 categories
  priceRange:  String    // "₹80,000 - ₹3,00,000"
  rating:      Number    // 1.0 - 5.0
  description: String
  phone:       String
  email:       String
  city:        String
  specialties: [String]  // Array of service specialties
}
```

---

## 5.2 API Endpoint Specification

### 5.2.1 Authentication APIs

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| POST | /api/auth/register | No | {name, email, phone, password} | {token, user} |
| POST | /api/auth/login | No | {email, password} | {token, user} |
| GET | /api/auth/me | Yes | — | {user} |
| PUT | /api/auth/profile | Yes | {name, email, phone} | {user} |

### 5.2.2 Booking APIs

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| POST | /api/bookings | Yes | {type, destinationId, packageId?, dates, guestCount, ...} | {booking} |
| GET | /api/bookings | Yes | — | [{bookings}] (user's own) |
| GET | /api/bookings/:id | Yes | — | {booking} |
| PUT | /api/bookings/:id | Yes | {guests?, timeline?, notes?} | {booking} |
| PATCH | /api/bookings/:id | Yes | {status: "cancelled"} | {booking} |
| DELETE | /api/bookings/:id | Yes | — | {message} |

### 5.2.3 Payment APIs

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| POST | /api/payment/initiate | Yes | {bookingId} | {amount, paidAmount, remaining} |
| POST | /api/payment | Yes | {bookingId, amount, method, paymentType} | {transaction, booking} |

### 5.2.4 AI APIs

| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|-------------|----------|
| POST | /api/ai/chat | Optional | {message, user_id} | {reply, sources?} |
| POST | /api/ai/agent | Optional | {message, user_id, state?} | {reply, action?, state} |
| POST | /api/ai/timeline | Optional | {days, style, guestCount, destination, notes?} | {timeline[]} |
| GET | /api/ai/chats | Optional | ?user_id&mode | {messages[]} |
| DELETE | /api/ai/chats | Optional | {user_id, mode} | {message} |

### 5.2.5 Admin APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/admin/stats | Admin | Dashboard statistics |
| GET/POST/PUT/DELETE | /api/admin/destinations[/:id] | Admin | CRUD destinations |
| GET/POST/PUT/DELETE | /api/admin/packages[/:id] | Admin | CRUD packages |
| GET/POST/PUT/DELETE | /api/admin/vendors[/:id] | Admin | CRUD vendors |
| GET/DELETE | /api/admin/bookings[/:id] | Admin | Read/delete bookings |
| GET/DELETE | /api/admin/users[/:id] | Admin | Read/delete users |

---

## 5.3 Data Access Layer (DAL) Pattern

The DAL abstracts database operations behind a common interface, enabling transparent switching between MongoDB and JSON fallback:

### Pattern:

```javascript
// Example: dal/bookings.js
import Booking from '../models/Booking.js';
import { isUsingFallback } from '../db/connect.js';
import { readJSON, writeJSON } from '../utils/jsonStore.js';

export async function getBookingById(id) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    return bookings.find(b => b.id === id) || null;
  }
  return Booking.findOne({ id });
}

export async function createBooking(data) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    bookings.push(data);
    writeJSON('bookings', bookings);
    return data;
  }
  return new Booking(data).save();
}

export async function updateBooking(id, updates) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    const idx = bookings.findIndex(b => b.id === id);
    if (idx === -1) return null;
    bookings[idx] = { ...bookings[idx], ...updates };
    writeJSON('bookings', bookings);
    return bookings[idx];
  }
  return Booking.findOneAndUpdate({ id }, updates, { new: true });
}
```

### DAL Files:
- `dal/users.js` — User CRUD operations
- `dal/bookings.js` — Booking lifecycle management
- `dal/destinations.js` — Destination queries with filters
- `dal/packages.js` — Package queries with filters
- `dal/vendors.js` — Vendor queries with category/destination filters
- `dal/chats.js` — Chat history read/write operations

---

## 5.4 AI Agent Engine – State Machine Design

The Agent Engine (`services/agentEngine.js`) implements a finite state machine for guided wedding planning:

### State Diagram:

```
┌──────────┐    user msg     ┌───────────────┐   "show packages"  ┌─────────────┐
│ discovery │──────────────▶│ pre_recommend │────────────────────▶│  recommend  │
│           │  (parse prefs) │  (show recap) │                    │ (top 3 pkgs)│
└──────────┘                └───────────────┘                    └──────┬──────┘
                                    │                                    │
                                    │ "refine"                          ├─── "package X"
                                    ▼                                    │
                             ┌──────────┐                               ▼
                             │ discovery │                    ┌──────────────────┐
                             └──────────┘                    │  PACKAGE PATH    │
                                                             │  pkg_date        │
                                                             │  pkg_guests      │
                                                             │  pkg_accommodation│
                                                             │  pkg_confirm     │
                                                             │  → done          │
                                                             └──────────────────┘
                                                                       
                                    "custom"  ───────────────▶┌──────────────────┐
                                                             │  CUSTOM PATH     │
                                                             │  cust_destination │
                                                             │  cust_style      │
                                                             │  cust_days       │
                                                             │  cust_date       │
                                                             │  cust_guests     │
                                                             │  cust_accommodation│
                                                             │  cust_vendors    │
                                                             │  cust_confirm    │
                                                             │  → done          │
                                                             └──────────────────┘
```

### State Transitions:

| Current State | User Input | Next State | Action |
|--------------|-----------|-----------|--------|
| discovery | Any message | pre_recommend | Parse budget, vibe, guests, season, days |
| pre_recommend | "show packages" / "looks good" | recommend | Rank & show top 3 packages |
| pre_recommend | "change budget" / refinement | discovery | Re-parse preferences |
| recommend | Package number (1-3) | pkg_date | Lock selected package |
| recommend | "custom" / "build my own" | cust_destination | Enter custom path |
| pkg_date | Date string | pkg_guests | Store wedding date |
| pkg_guests | Number | pkg_accommodation | Store guest count |
| pkg_accommodation | Type selection | pkg_confirm | Store accommodation |
| pkg_confirm | "confirm" / "yes" | done | Return navigation action |
| cust_* | Various inputs | next cust_* step | Collect custom selections |
| Any state | "__reset__" / "start over" | discovery | Clear all state |

### Preference Parsing (Gemini-powered):

```
Input: "I want a royal wedding in Rajasthan for about 200 guests, 
        budget around 30 lakhs, winter season, 3 day celebration"

Extracted (JSON mode, temp 0.1):
{
  "budget": 3000000,
  "vibe": "royal",
  "guestCount": 200,
  "season": "winter",
  "days": 3,
  "country": "India"
}
```

### Fallback Heuristic Parser (when Gemini unavailable):
- Budget: regex for "XL" (X×100000), "X lakh", "₹X,XX,XXX"
- Guests: regex for "N guests", "N people"
- Days: regex for "N day", "N-day"
- Season: keyword matching (winter→Oct-Mar, summer→Apr-Jun, monsoon→Jul-Sep)
- Vibe: keyword set matching (royal, beach, garden, temple, modern, etc.)

---

## 5.5 Payment Processing – Detailed Flow

### Calculation Logic:

```
Base Amount = Package Price (for packages)
            OR (Destination.pricePerDay × days × accommodationMultiplier) + Σ(vendor costs)

Accommodation Multipliers:
  hotel block   → 1.0x
  mixed         → 0.8x  
  villa         → 1.6x
  resort buyout → 2.0x

Vendor Cost Calculation:
  Catering/Invitations: (min + (max-min)*0.5) × guestCount → round to nearest 10K
  Other vendors:        (min + (max-min)*0.35) × dayFactor → where dayFactor = min(days/3, 2)

Tax: 18% GST on base amount
Total = Base + Tax
```

### Payment Types:

| Type | Amount | When |
|------|--------|------|
| full | 100% of total | First payment, paying in full |
| partial | 30% of total | First payment, deposit only |
| remaining | total - paidAmount | Subsequent payment to complete |

### Transaction Recording:

Each payment creates:
1. Update `booking.payment.paidAmount += amount`
2. Update `booking.payment.status` (partial if balance remains, paid if fully paid)
3. Update `booking.status = 'confirmed'` when fully paid
4. Append to `booking.payment.history[]`
5. Create record in `payments.json` / payments collection
6. Fire async email notification

---

## 5.6 Email Service Design

### Email Templates:

**Booking Confirmation**:
- Subject: "🎉 Booking Confirmed – Promise Paradise"
- Content: Booking ID, destination, date, guest count, amount paid, remaining balance, next steps
- Style: Beige/gold themed HTML with Promise Paradise branding

**Guest Invitation**:
- Subject: "You're Invited! 💍 [Couple Name]'s Wedding"
- Content: Couple names, destination, date, venue details, RSVP link
- Style: Elegant invitation-style HTML

**Cancellation Notice**:
- Subject: "Booking Cancelled – Promise Paradise"
- Content: Booking ID, cancellation confirmation, refund info

### Implementation:
- Non-blocking (async, fire-and-forget)
- Failures logged but don't break the booking flow
- Gmail SMTP with App Password authentication
- HTML email with inline styles for maximum compatibility

---
