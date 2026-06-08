# Chapter 6: Module Design

## 6.1 System Module Overview (Block Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROMISE PARADISE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    AUTH      │  │  DISCOVERY  │  │   BOOKING   │  │   PAYMENT   │  │
│  │   MODULE    │  │   MODULE    │  │   MODULE    │  │   MODULE    │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤  │
│  │• Register   │  │• Destinations│  │• Package    │  │• Initiate   │  │
│  │• Login      │  │• Packages   │  │  Flow       │  │• Full Pay   │  │
│  │• Profile    │  │• Vendors    │  │• Custom     │  │• Partial    │  │
│  │• JWT Mgmt   │  │• Filters    │  │  Flow       │  │• Remaining  │  │
│  │• Admin Seed │  │• Search     │  │• Edit/Cancel│  │• History    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │     AI      │  │   ADMIN     │  │   EMAIL     │  │  DATABASE   │  │
│  │   MODULE    │  │   MODULE    │  │   MODULE    │  │   MODULE    │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤  │
│  │• Ask Mode   │  │• Dashboard  │  │• Confirm    │  │• MongoDB    │  │
│  │• Agent Mode │  │• CRUD Dest  │  │• Invite     │  │• JSON Store │  │
│  │• Timeline   │  │• CRUD Pkg   │  │• Cancel     │  │• DAL Layer  │  │
│  │• Chat Store │  │• CRUD Vendor│  │• Templates  │  │• Auto Switch│  │
│  │• Recommendations│• Users Mgmt│  │• SMTP       │  │• Seeding    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6.2 Authentication Module

### Purpose:
Handles user registration, login, token management, and profile operations.

### Components:

| Component | File | Responsibility |
|-----------|------|---------------|
| Auth Routes | `routes/auth.js` | HTTP endpoint definitions |
| Auth Middleware | `middleware/auth.js` | JWT verification for protected routes |
| Admin Middleware | `middleware/admin.js` | Admin role verification |
| Users DAL | `dal/users.js` | User database operations |
| User Model | `models/User.js` | Mongoose schema definition |
| Admin Seeder | `utils/seedAdmin.js` | Auto-create admin account on startup |

### Flow:

**Registration**:
1. Validate input (name, email, password required)
2. Check if email already exists → 400 error if duplicate
3. Hash password with bcrypt (10 salt rounds)
4. Generate UUID for user ID
5. Save user record
6. Generate JWT token { id, email, isAdmin: false }
7. Return token + user (without passwordHash)

**Login**:
1. Find user by email
2. Compare password with stored hash
3. Generate JWT on match
4. Return token + user

**Auth Middleware**:
1. Extract token from `Authorization: Bearer <token>` header
2. Verify token signature with JWT_SECRET
3. Decode claims { id, email, isAdmin }
4. Attach user info to `req.user`
5. Call `next()` or return 401

---

## 6.3 Discovery Module (Destinations, Packages, Vendors)

### Purpose:
Provides browsable catalogs of destinations, wedding packages, and vendors with filtering capabilities.

### Endpoints & Filters:

**Destinations** (`/api/destinations`):
- Filter: `isInternational` (boolean), `maxPrice` (number), `season` (string)
- Returns: Full destination objects with sub-places

**Packages** (`/api/packages`):
- Filter: `destinationId`, `maxPrice`, `minGuests`
- Returns: Package objects with included services

**Vendors** (`/api/vendors`):
- Filter: `category`, `destinationId` (currently returns all; frontend filters further)
- Returns: Vendor objects sorted by rating

### Frontend Components:
- `DestinationCard.jsx` — Card display with image, name, price, highlights
- `PackageCard.jsx` — Card with tier badge, price, duration, includes
- Gallery page with destination imagery

---

## 6.4 Booking Module

### Purpose:
Manages the complete booking lifecycle through two distinct planning flows.

### 6.4.1 Package Flow (4 Steps)

| Step | Page Section | User Actions |
|------|-------------|-------------|
| 1. Select Package | Package grid with filters | Browse, filter by tier/price/destination, select |
| 2. Customize | Form fields | Set date, guest count, accommodation type, notes |
| 3. Timeline | AI/manual timeline builder | Generate AI timeline or create manual schedule |
| 4. Review & Book | Summary + cost breakdown | Review all selections, confirm booking |

**Cost Calculation (Package Flow)**:
```
Total = Package.price + (18% GST)
```

### 6.4.2 Custom Flow (5 Steps)

| Step | Page Section | User Actions |
|------|-------------|-------------|
| 1. Destination | Destination grid + venue picker | Select destination & sub-place venue |
| 2. Style & Timeline | Style picker + day planner | Choose style, date, days, accommodation, build timeline |
| 3. Guests | Guest list builder | Add guests with details (email, dietary, RSVP) |
| 4. Vendors | Multi-category vendor selector | Pick vendors by category with cost preview |
| 5. Review & Book | Full plan summary + pricing | Review everything, confirm booking |

**Cost Calculation (Custom Flow)**:
```
baseCost = destination.pricePerDay × days × accommodationMultiplier
vendorCost = Σ(calculated vendor costs based on category/guests/days)
tax = (baseCost + vendorCost) × 0.18
total = baseCost + vendorCost + tax
```

### 6.4.3 Booking Management

After creation, users can:
- View all their bookings (list view with status badges)
- View booking details (full breakdown)
- Edit allowed fields: guests, timeline, contact info
- Cancel booking (status → "cancelled", email notification sent)

---

## 6.5 Payment Module

### Purpose:
Processes payments for bookings with support for full and installment payments.

### Components:
- `routes/payment.js` — Payment endpoint definitions
- Frontend `Payment.jsx` — Checkout page with payment type selection

### Workflow:

1. **Initiate**: `POST /api/payment/initiate` → Returns amount breakdown
2. **Process**: `POST /api/payment` → Validates, records, updates booking
3. **Track**: Payment history stored in `booking.payment.history[]`

### Payment States:

```
pending → partial (30% paid) → paid (100% paid)
pending → paid (full payment at once)
```

### Business Rules:
- Minimum partial payment: 30% of total
- Booking confirmed only when fully paid
- Multiple partial payments tracked in history array
- Each transaction gets unique ID: "PP" + timestamp

---

## 6.6 AI Concierge Module

### Purpose:
Provides intelligent wedding planning assistance through natural language interaction.

### Components:

| Component | File | Purpose |
|-----------|------|---------|
| AI Routes | `routes/ai.js` | HTTP endpoints for chat/agent/timeline |
| Agent Engine | `services/agentEngine.js` | State machine + recommendation logic |
| Chats DAL | `dal/chats.js` | Chat history persistence |

### Sub-Modules:

**Ask Mode** (`/api/ai/chat`):
- Injects full platform context (destinations, packages, vendors, user bookings)
- Gemini generates conversational responses
- Formats with markdown + pp:// action links
- History limited to 50 messages per user

**Agent Mode** (`/api/ai/agent`):
- State machine drives conversation through phases
- Preference parsing via Gemini JSON mode
- Multi-factor ranking algorithm for recommendations
- Outputs navigation actions to booking flows
- Preserves state server-side per user

**Timeline Generator** (`/api/ai/timeline`):
- Input: days, style, guests, destination
- Output: Structured JSON timeline with events, times, venues
- Fallback: Template-based generation if AI unavailable

---

## 6.7 Admin Module

### Purpose:
Complete platform management for administrators with analytics dashboard.

### Features:

**Dashboard Statistics**:
- Total users, bookings, destinations, packages, vendors
- Booking breakdown: confirmed, pending, cancelled counts
- Total revenue (sum of all paid amounts)

**CRUD Operations**:

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Destinations | ✓ | ✓ | ✓ | ✓ |
| Packages | ✓ | ✓ | ✓ | ✓ |
| Vendors | ✓ | ✓ | ✓ | ✓ |
| Bookings | ✗ | ✓ | ✗ | ✓ |
| Users | ✗ | ✓ (safe, no passwords) | ✗ | ✓ |

**Admin Access Control**:
- Requires valid JWT + `isAdmin: true` claim
- OR email matching `ADMIN_EMAIL` environment variable
- Admin account auto-seeded on server startup

---

## 6.8 Email Notification Module

### Purpose:
Sends transactional emails at key booking lifecycle events.

### Components:
- `routes/email.js` — Email endpoint definitions
- `utils/mailer.js` — Nodemailer configuration and sending

### Email Types:

| Event | Trigger | Recipients | Content |
|-------|---------|-----------|---------|
| Booking Confirmation | Payment processed | User (booker) | Booking details, payment info, remaining balance |
| Guest Invitation | User sends invite | Individual guests | Wedding details, destination, date, RSVP |
| Cancellation | Booking cancelled | User (booker) | Cancellation confirmation |

### Technical Implementation:
- Transport: Gmail SMTP with App Password
- Template: Inline HTML with beige/gold theme
- Execution: Async (non-blocking, failures don't affect main flow)
- Error Handling: Logged but gracefully handled

---
