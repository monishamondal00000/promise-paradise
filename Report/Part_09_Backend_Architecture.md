# Chapter 9: Backend Architecture & API Design

## 9.1 Express Server Setup

### Server Initialization (`server.js`):

```javascript
// Core Setup
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/connect.js';
import { ensureAdminUser } from './utils/seedAdmin.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection (with fallback)
await connectDB();

// Admin Account Seeding
await ensureAdminUser();

// Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: isUsingFallback() ? 'JSON Fallback' : 'MongoDB', timestamp: new Date().toISOString() });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Startup Sequence:
1. Load environment variables
2. Initialize Express with middleware
3. Attempt MongoDB connection → fallback to JSON if fails
4. Ensure admin user exists
5. Register all route handlers
6. Start listening on configured port
7. Display startup banner with mode information

---

## 9.2 Middleware Pipeline

### Request Processing Order:

```
Incoming Request
    │
    ▼
┌─── CORS Middleware ───┐
│ Allows configured     │
│ origins (all in dev)  │
└───────────┬───────────┘
            │
            ▼
┌─── JSON Body Parser ──┐
│ express.json()        │
│ Parses request body   │
└───────────┬───────────┘
            │
            ▼
┌─── Route Matching ────┐
│ /api/auth, /api/dest  │
│ etc.                  │
└───────────┬───────────┘
            │
    ┌───────┼───────────────────┐
    │       │                   │
    ▼       ▼                   ▼
[Public] [Auth Required]   [Admin Required]
         │                      │
         ▼                      ▼
  ┌── authMiddleware ──┐  ┌── authMiddleware ──┐
  │ Verify JWT token   │  │ Verify JWT token   │
  │ Decode claims      │  │ Decode claims      │
  │ Attach req.user    │  └─────────┬──────────┘
  └────────┬───────────┘            │
           │                        ▼
           │               ┌── adminMiddleware ─┐
           │               │ Check isAdmin flag │
           │               │ OR ADMIN_EMAIL     │
           │               └─────────┬──────────┘
           │                         │
           ▼                         ▼
      Route Handler             Route Handler
```

### Auth Middleware (`middleware/auth.js`):

```javascript
export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, isAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Admin Middleware (`middleware/admin.js`):

```javascript
export default function adminMiddleware(req, res, next) {
  if (!req.user.isAdmin && req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

---

## 9.3 Route-Handler-DAL Pattern

Promise Paradise follows a clean three-layer architecture for request processing:

```
Route Definition → Handler Logic → DAL Function → Storage
```

### Example: Create Booking

**Route** (`routes/bookings.js`):
```javascript
router.post('/', authMiddleware, async (req, res) => { ... });
```

**Handler Logic** (within route file):
```javascript
// 1. Extract data from request
const bookingData = {
  id: 'PP' + generateId(10),
  userId: req.user.id,
  type: req.body.type,
  status: 'pending',
  ...req.body,
  payment: { amount: req.body.totalAmount, paidAmount: 0, status: 'pending', history: [] },
  editableAfterBooking: ['guests', 'timeline', 'contactInfo'],
  createdAt: new Date().toISOString()
};

// 2. Call DAL
const booking = await createBooking(bookingData);

// 3. Return response
res.status(201).json(booking);
```

**DAL** (`dal/bookings.js`):
```javascript
export async function createBooking(data) {
  if (isUsingFallback()) {
    const bookings = readJSON('bookings');
    bookings.push(data);
    writeJSON('bookings', bookings);
    return data;
  }
  return new Booking(data).save();
}
```

---

## 9.4 Complete API Reference Table

### Public Endpoints (No Authentication)

| # | Method | Endpoint | Description | Query Params |
|---|--------|----------|-------------|-------------|
| 1 | GET | /api/health | Server health & mode | – |
| 2 | POST | /api/auth/register | Create account | – |
| 3 | POST | /api/auth/login | Login | – |
| 4 | GET | /api/destinations | List destinations | isInternational, maxPrice, season |
| 5 | GET | /api/destinations/:id | Destination detail | – |
| 6 | GET | /api/packages | List packages | destinationId, maxPrice, minGuests |
| 7 | GET | /api/packages/:id | Package detail | – |
| 8 | GET | /api/vendors | List vendors | category |
| 9 | GET | /api/vendors/:id | Vendor detail | – |

### Protected Endpoints (JWT Required)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 10 | GET | /api/auth/me | Current user info |
| 11 | PUT | /api/auth/profile | Update profile |
| 12 | POST | /api/bookings | Create booking |
| 13 | GET | /api/bookings | User's bookings |
| 14 | GET | /api/bookings/:id | Booking detail |
| 15 | PUT | /api/bookings/:id | Update booking |
| 16 | PATCH | /api/bookings/:id | Update status |
| 17 | DELETE | /api/bookings/:id | Delete booking |
| 18 | POST | /api/payment/initiate | Get payment info |
| 19 | POST | /api/payment | Process payment |
| 20 | POST | /api/email/confirmation | Send confirmation email |
| 21 | POST | /api/email/invite | Send guest invitation |

### AI Endpoints (Optional Auth)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 22 | POST | /api/ai/chat | Ask mode message |
| 23 | POST | /api/ai/agent | Agent mode message |
| 24 | POST | /api/ai/timeline | Generate timeline |
| 25 | GET | /api/ai/chats | Get chat history |
| 26 | DELETE | /api/ai/chats | Clear history |

### Admin Endpoints (JWT + Admin Role)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 27 | GET | /api/admin/stats | Dashboard stats |
| 28-31 | CRUD | /api/admin/destinations | Manage destinations |
| 32-35 | CRUD | /api/admin/packages | Manage packages |
| 36-39 | CRUD | /api/admin/vendors | Manage vendors |
| 40-41 | GET/DEL | /api/admin/bookings | View/delete bookings |
| 42-43 | GET/DEL | /api/admin/users | View/delete users |

**Total: 43 API endpoints**

---

## 9.5 Error Handling

### HTTP Status Codes Used:

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (booking, user) |
| 400 | Bad Request | Validation errors, missing fields |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Non-admin accessing admin routes |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected errors |

### Error Response Format:
```json
{
  "error": "Human-readable error message"
}
```

### Validation Approach:
- Route-level input validation (required fields check)
- Mongoose schema validation (for MongoDB mode)
- Business logic validation (e.g., can't pay more than remaining)
- Graceful degradation for optional services (email, AI)

---

## 9.6 CORS & Security

### CORS Configuration:
```javascript
app.use(cors());  // Allows all origins in development
// Production: configure specific origins
```

### Security Measures Implemented:

| Measure | Implementation | Purpose |
|---------|---------------|---------|
| Password Hashing | bcrypt (10 rounds) | Protect stored passwords |
| JWT Authentication | Signed tokens, 7-day expiry | Stateless auth |
| Admin Authorization | Role check middleware | Protect admin routes |
| Input Validation | Route-level checks | Prevent malformed data |
| Safe User Responses | Strip passwordHash from responses | No password leakage |
| Environment Variables | dotenv for secrets | No hardcoded credentials |
| Non-blocking Email | Async fire-and-forget | DoS resistance |

### Frontend Security:
- Token stored in localStorage (removed on logout)
- Axios interceptor auto-attaches token
- Protected routes redirect to login
- Admin routes check isAdmin before rendering

---
