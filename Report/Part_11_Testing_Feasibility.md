# Chapter 11: Testing & Feasibility Study

## 11.1 Testing Strategy

### Testing Approach:
Promise Paradise employs a multi-layered testing strategy covering API validation, component testing, and user acceptance.

### Testing Tools:
- **Postman**: API endpoint testing with collections
- **Browser DevTools**: Frontend debugging, network monitoring, console logging
- **Manual Testing**: End-to-end user flow verification
- **Health Check Endpoint**: Automated system status verification

---

## 11.2 API Testing

### Test Cases for Authentication:

| # | Test Case | Input | Expected Output | Status |
|---|-----------|-------|-----------------|--------|
| 1 | Register with valid data | {name, email, phone, password} | 201, {token, user} | Pass |
| 2 | Register with existing email | Duplicate email | 400, {error} | Pass |
| 3 | Register without password | Missing password | 400, {error} | Pass |
| 4 | Login with valid credentials | {email, password} | 200, {token, user} | Pass |
| 5 | Login with wrong password | Invalid password | 400, {error} | Pass |
| 6 | Access protected route without token | No Authorization header | 401, {error} | Pass |
| 7 | Access protected route with expired token | Expired JWT | 401, {error} | Pass |
| 8 | Access admin route as non-admin | Valid user JWT | 403, {error} | Pass |

### Test Cases for Bookings:

| # | Test Case | Input | Expected Output | Status |
|---|-----------|-------|-----------------|--------|
| 1 | Create package booking | Valid booking data | 201, {booking with PP-ID} | Pass |
| 2 | Create custom booking | Custom flow data | 201, {booking} | Pass |
| 3 | Get user's bookings | GET with auth | 200, [bookings] (own only) | Pass |
| 4 | Get booking by ID | Valid booking ID | 200, {booking} | Pass |
| 5 | Get other user's booking | Different user's booking ID | 404 or 403 | Pass |
| 6 | Update guests | PUT with guest array | 200, {updated booking} | Pass |
| 7 | Cancel booking | PATCH {status: cancelled} | 200, {booking with cancelled} | Pass |

### Test Cases for Payment:

| # | Test Case | Input | Expected Output | Status |
|---|-----------|-------|-----------------|--------|
| 1 | Full payment | {bookingId, amount: total, type: full} | 200, booking.status = confirmed | Pass |
| 2 | Partial payment (30%) | {bookingId, amount: 30%, type: partial} | 200, status = partial | Pass |
| 3 | Remaining payment | {bookingId, amount: remaining, type: remaining} | 200, status = paid, confirmed | Pass |
| 4 | Overpayment attempt | Amount > remaining | 400, {error} | Pass |
| 5 | Payment for non-existent booking | Invalid bookingId | 404, {error} | Pass |

### Test Cases for AI:

| # | Test Case | Input | Expected Output | Status |
|---|-----------|-------|-----------------|--------|
| 1 | Ask mode - general question | "What destinations do you have?" | 200, {reply with destinations} | Pass |
| 2 | Agent mode - preference input | "Royal, 200 guests, 30L" | 200, {reply + parsed state} | Pass |
| 3 | Agent mode - reset | "__reset__" | 200, {fresh state} | Pass |
| 4 | Timeline generation | {days: 3, style: "Royal"} | 200, {timeline array} | Pass |
| 5 | AI unavailable fallback | No GEMINI_API_KEY | 200, {heuristic response} | Pass |

---

## 11.3 Validation Testing

### Frontend Validation:

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| Email | Valid email format | "Please enter a valid email" |
| Password | Minimum 6 characters | "Password must be at least 6 characters" |
| Name | Required, non-empty | "Name is required" |
| Wedding Date | Future date only | "Please select a future date" |
| Guest Count | Positive integer | "Enter a valid guest count" |
| Phone | Numeric, 10 digits | "Enter a valid phone number" |

### Backend Validation:

| Endpoint | Validation | Action on Failure |
|----------|-----------|-------------------|
| POST /register | Email unique, password present | 400 error |
| POST /bookings | Required fields present, valid type | 400 error |
| POST /payment | Amount > 0, ≤ remaining | 400 error |
| PUT /bookings | Only editable fields modified | Ignore non-editable |
| Admin CRUD | Required fields per entity type | 400 error |

---

## 11.4 Technical Feasibility

### Assessment:

| Factor | Analysis | Verdict |
|--------|----------|---------|
| Technology Maturity | MERN stack (10+ years mature), well-documented | ✓ Feasible |
| AI Integration | Gemini API stable, well-documented, low cost | ✓ Feasible |
| Developer Availability | JavaScript/React developers abundant | ✓ Feasible |
| Infrastructure | Can run on single VPS ($5-20/month) or free tier | ✓ Feasible |
| Scalability | Node.js handles concurrent I/O well; MongoDB scales horizontally | ✓ Feasible |
| Fallback System | JSON store ensures zero-infrastructure deployment | ✓ Feasible |

### Technical Risks & Mitigations:

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Gemini API downtime | Low | Medium | Fallback heuristic parser |
| MongoDB unavailability | Low | Medium | Automatic JSON fallback |
| Email delivery failure | Medium | Low | Non-blocking, logged errors |
| High concurrent writes (JSON mode) | Medium | High | Recommend MongoDB for production |
| Token theft | Low | High | Short expiry, HTTPS in production |

---

## 11.5 Economic Feasibility

### Development Cost Estimate:

| Component | Hours | Rate (₹/hr) | Cost (₹) |
|-----------|-------|-------------|----------|
| Backend Development | 120 | 800 | 96,000 |
| Frontend Development | 150 | 800 | 1,20,000 |
| AI Integration | 40 | 1,000 | 40,000 |
| Database Design | 20 | 800 | 16,000 |
| Testing & QA | 40 | 600 | 24,000 |
| Documentation | 20 | 500 | 10,000 |
| **Total Development** | **390** | | **₹3,06,000** |

### Infrastructure Cost (Monthly):

| Service | Free Tier | Production |
|---------|-----------|------------|
| Server (VPS) | ₹0 (local) | ₹1,000-3,000 |
| MongoDB Atlas | Free (512MB) | ₹0-2,000 |
| Domain Name | – | ₹800/year |
| Gemini API | Free (60 req/min) | ₹500-2,000 |
| Email (Gmail) | Free (500/day) | ₹0 |
| **Monthly Total** | **₹0** | **₹1,500-7,000** |

### Comparison with Existing Solutions:

| Solution | Development Cost | Monthly Cost | Features |
|----------|-----------------|-------------|----------|
| Hire Wedding Planner | ₹0 | ₹5-25L per event | Human-managed |
| WedMeGood Premium | ₹0 | ₹10,000-50,000 | Vendor lead gen |
| Custom Development (outsource) | ₹10-30L | ₹10,000-50,000 | Full control |
| **Promise Paradise** | **₹3.06L** | **₹1,500-7,000** | **Full platform + AI** |

**Verdict**: Economically viable with very low operational costs and potential for high ROI through platform fees.

---

## 11.6 Operational Feasibility

### User Acceptance Factors:

| Factor | Assessment |
|--------|-----------|
| Ease of Use | Multi-step wizards guide users; AI assists confused users |
| Learning Curve | Minimal — standard web interface patterns |
| Response Time | <500ms for most API calls; <3s for AI responses |
| Availability | 99.9% with JSON fallback (non-dependent on external DB) |
| Support | AI concierge acts as 24/7 support; admin panel for manual intervention |
| Browser Compatibility | Chrome, Firefox, Safari, Edge (modern versions) |

### Deployment Options:

| Environment | Difficulty | Cost | Best For |
|------------|-----------|------|----------|
| Local (JSON mode) | Very Easy | Free | Demo, development |
| VPS + MongoDB Atlas | Easy | ₹1,000/mo | Small teams, startup |
| Cloud (AWS/GCP/Azure) | Medium | ₹3,000-10,000/mo | Production scale |

---

## 11.7 Schedule Feasibility

### Development Timeline (Gantt Chart Overview):

```
Week 1-2:   [████████████████] Project Setup, Database Design, Auth Module
Week 3-4:   [████████████████] Destination/Package/Vendor Modules (Backend + Frontend)
Week 5-6:   [████████████████] Booking Module (Package Flow + Custom Flow)
Week 7-8:   [████████████████] Payment Module, Email Module
Week 9-10:  [████████████████] AI Concierge (Ask + Agent + Timeline)
Week 11:    [████████]         Admin Panel
Week 12:    [████████]         Testing, Bug Fixes, Documentation
```

**Total Timeline: 12 weeks (3 months)**

---
