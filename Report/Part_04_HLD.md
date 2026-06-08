# Chapter 4: High-Level Design (HLD)

## 4.1 System Architecture Overview

Promise Paradise follows a **three-tier client-server architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
│  React 18 SPA (Vite) │ Components │ Pages │ Context │ Router    │
│  Port: 3000          │ Axios HTTP Client │ localStorage          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST (JSON)
                               │ JWT Bearer Authentication
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                            │
│  Node.js + Express Server │ Port: 5000                          │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐    │
│  │  Routes  │ │Middleware│ │   DAL   │ │  Services (AI)   │    │
│  │ (9 groups)│ │(Auth/CORS)│ │(Queries)│ │(Agent Engine)    │    │
│  └─────────┘ └──────────┘ └────┬────┘ └──────────────────┘    │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼                             ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      DATA TIER (Primary) │    │   DATA TIER (Fallback)   │
│      MongoDB 7.x         │    │   JSON File Store        │
│      (Mongoose ODM)      │    │   /backend/data/*.json   │
│      5 Collections       │    │   7 JSON files           │
└──────────────────────────┘    └──────────────────────────┘

                    ┌──────────────────────────────┐
                    │     EXTERNAL SERVICES         │
                    │  • Google Gemini AI API       │
                    │  • Gmail SMTP (Nodemailer)    │
                    └──────────────────────────────┘
```

---

## 4.2 Client-Server Communication

### Request Flow:

```
User Action → React Component → Axios Request (+ JWT header)
    → Express Router → Middleware Chain → Route Handler
    → DAL Function → Database/JSON → Response → React State Update → UI Re-render
```

### Communication Protocol:
- **Protocol**: HTTP/1.1 over TCP
- **Data Format**: JSON (application/json)
- **Authentication**: Bearer token in Authorization header
- **CORS**: Enabled for frontend origin (localhost:3000 in dev)

### API Base URL Configuration:
- **Development**: Vite proxy redirects `/api/*` to `http://localhost:5000`
- **Production**: Same-origin or configured base URL

---

## 4.3 Data Flow Overview

### 4.3.1 User Registration & Login Flow

```
┌────────┐         ┌────────────┐         ┌──────────┐
│ Client │──POST──▶│ /api/auth  │──hash──▶│ Database │
│        │         │  /register │  pwd    │  (Users) │
│        │◀─JWT────│            │◀─save───│          │
└────────┘         └────────────┘         └──────────┘
```

1. User submits registration form (name, email, phone, password)
2. Backend validates input, hashes password (bcrypt, 10 rounds)
3. Creates user record with UUID
4. Returns JWT token with claims { id, email, isAdmin }
5. Frontend stores token in localStorage (`pp_token`)
6. All subsequent requests include `Authorization: Bearer <token>`

### 4.3.2 Booking Creation Flow

```
┌────────┐      ┌──────────┐      ┌─────────┐      ┌──────────┐
│ Client │─POST─▶│ /bookings│─auth─▶│  Create │─save─▶│ Database │
│(Review │      │          │      │ Booking │      │(Bookings)│
│ Step)  │◀─────│          │◀─────│ (PP-ID) │◀─────│          │
└────────┘ id   └──────────┘      └─────────┘      └──────────┘
     │
     ▼ redirect
┌────────────┐
│ /checkout/ │
│  :bookingId│
└────────────┘
```

### 4.3.3 AI Chat Flow

```
┌────────┐       ┌──────────┐       ┌──────────────┐       ┌────────────┐
│ Client │─POST──▶│ /api/ai/ │─inject─▶│ Build Prompt │─call──▶│ Google     │
│        │       │  chat    │ context│ (system +    │       │ Gemini API │
│        │◀──────│          │◀───────│  user msg)   │◀──────│ (2.5 Flash)│
└────────┘ reply └──────────┘        └──────────────┘ JSON  └────────────┘
                      │
                      ▼ save history
                 ┌──────────┐
                 │  Chats   │
                 │  Store   │
                 └──────────┘
```

### 4.3.4 Payment Processing Flow

```
┌────────┐      ┌───────────┐      ┌──────────────┐      ┌────────────┐
│Checkout│─POST─▶│ /payment  │─calc─▶│ Process      │─save─▶│  Bookings  │
│  Page  │      │           │      │ (validate,   │      │  Payments  │
│        │◀─────│           │◀─────│  update,     │◀─────│            │
└────────┘ txn  └───────────┘      │  record)     │      └────────────┘
                                   └──────┬───────┘
                                          │ async
                                          ▼
                                   ┌──────────────┐
                                   │ Send Email   │
                                   │ Confirmation │
                                   └──────────────┘
```

---

## 4.4 API Gateway & Routing Structure

The Express server organizes endpoints into 9 route groups:

```
/api
├── /auth          → Authentication (register, login, profile)
├── /destinations  → Destination browsing (public)
├── /packages      → Package browsing (public)
├── /vendors       → Vendor browsing (public)
├── /bookings      → Booking CRUD (protected)
├── /payment       → Payment processing (protected)
├── /ai            → AI chat & agent (optional auth)
├── /email         → Email sending (protected)
├── /admin         → Admin operations (protected + admin)
└── /health        → Health check (public)
```

### Middleware Pipeline:

```
Request → CORS → JSON Parser → Route Matching
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              [Public Routes]  [Protected]     [Admin Routes]
              (no auth needed)  authMiddleware  authMiddleware
                                    │          + adminMiddleware
                                    ▼               │
                              Route Handler         ▼
                                              Route Handler
```

---

## 4.5 Database Strategy: MongoDB + JSON Fallback

### Architecture Decision:

Promise Paradise implements a **dual-storage architecture** to ensure maximum deployability and resilience:

```
┌─────────────────────────────────────────┐
│            Application Layer            │
│         (Routes + Handlers)             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        Data Access Layer (DAL)          │
│   isUsingFallback() → branch logic     │
└─────────┬───────────────────┬───────────┘
          │                   │
          ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│    MongoDB       │  │   JSON Store     │
│  (Mongoose)      │  │  (fs read/write) │
│                  │  │                  │
│ • Full queries   │  │ • Array filter   │
│ • Indexes        │  │ • File I/O       │
│ • Aggregation    │  │ • Pretty JSON    │
│ • Transactions   │  │ • No setup       │
└──────────────────┘  └──────────────────┘
```

### Activation Logic:

```javascript
// On server startup:
if (!MONGODB_URI || MONGODB_URI === 'YOUR_MONGO_URI_HERE') {
    → Activate JSON Fallback (no connection attempt)
}
else {
    try { connect(MONGODB_URI) }
    catch { → Activate JSON Fallback (connection failed) }
}
```

### Benefits:
- **Zero-setup deployment**: Run the app without installing MongoDB
- **Development convenience**: New developers can start immediately
- **Resilience**: System continues working even if database goes down
- **Portability**: JSON files are human-readable and easily transferable

---

## 4.6 Authentication & Authorization Architecture

### Token-Based Authentication Flow:

```
┌─────────┐    Credentials     ┌──────────┐    Verify + Hash    ┌──────────┐
│  Client │───────────────────▶│  Server  │────────────────────▶│ Database │
│         │                    │          │◀────────────────────│          │
│         │◀── JWT Token ──────│          │     User Record     │          │
└─────────┘                    └──────────┘                     └──────────┘
     │
     │ Store in localStorage (pp_token)
     │
     ▼ All subsequent requests:
┌─────────┐  Authorization:    ┌──────────┐    Decode + Verify  ┌──────────┐
│  Client │  Bearer <token>   ▶│  Server  │───────────────────▶│   JWT    │
│         │                    │          │◀── {id,email,admin} │  Library │
│         │◀── Protected Data──│          │                     └──────────┘
└─────────┘                    └──────────┘
```

### Authorization Levels:

| Level | Access | Middleware | Example Routes |
|-------|--------|-----------|----------------|
| Public | Anyone | None | GET /destinations, /packages, /vendors |
| Authenticated | Logged-in users | authMiddleware | /bookings, /payment, /profile |
| Admin | Admin users only | authMiddleware + adminMiddleware | /admin/* |

### Security Measures:
- Passwords hashed with bcrypt (10 salt rounds)
- JWT expiry: 7 days
- Token payload: minimal claims (id, email, isAdmin)
- No sensitive data in tokens
- Admin verification: checks `isAdmin` flag OR matches `ADMIN_EMAIL` env var

---

## 4.7 Deployment Architecture

### Development Setup:

```
┌──────────────────────┐     ┌──────────────────────┐
│   Vite Dev Server    │     │   Express Server     │
│   Port: 3000         │────▶│   Port: 5000         │
│   (Proxy /api → 5000)│     │   (API + Static)     │
└──────────────────────┘     └──────────┬───────────┘
                                        │
                             ┌──────────┴───────────┐
                             │  MongoDB / JSON Files │
                             └──────────────────────┘
```

### Production-Ready Architecture:

```
┌─────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────┐
│  Users  │────▶│   CDN/Nginx  │────▶│  Node.js App   │────▶│ MongoDB  │
│(Browser)│     │(Static Files)│     │  (Express API) │     │  Atlas   │
└─────────┘     └──────────────┘     └───────┬────────┘     └──────────┘
                                             │
                                    ┌────────┴────────┐
                                    │ External APIs   │
                                    │ • Gemini AI     │
                                    │ • Gmail SMTP    │
                                    └─────────────────┘
```

### Environment Variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| PORT | Server port (default: 5000) | No |
| MONGODB_URI | MongoDB connection string | No (fallback activates) |
| JWT_SECRET | Token signing key | Yes |
| JWT_EXPIRES_IN | Token expiry (default: 7d) | No |
| GEMINI_API_KEY | Google AI API key | For AI features |
| EMAIL_USER | Gmail address for sending | For email features |
| EMAIL_PASS | Gmail app password | For email features |
| ADMIN_EMAIL | Admin account email | No (default: adminpp@gmail.com) |
| ADMIN_PASSWORD | Admin account password | No (default: pp@12345) |

---
