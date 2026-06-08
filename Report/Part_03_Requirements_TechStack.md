# Chapter 3: System Requirements & Tools/Technologies

## 3.1 Hardware Requirements

### 3.1.1 Development Environment

| Component | Minimum Requirement | Recommended |
|-----------|-------------------|-------------|
| Processor | Intel Core i3 / AMD Ryzen 3 | Intel Core i5 / AMD Ryzen 5 or above |
| RAM | 4 GB | 8 GB or above |
| Storage | 10 GB free space | 20 GB SSD |
| Display | 1366 × 768 | 1920 × 1080 |
| Network | Broadband (for npm, API calls) | Stable broadband connection |
| OS | Windows 10 / macOS 10.15 / Ubuntu 18.04 | Windows 11 / macOS 13+ / Ubuntu 22.04 |

### 3.1.2 Production/Server Environment

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 5 GB SSD | 20 GB SSD |
| Network | 1 Gbps | 1 Gbps with CDN |
| OS | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |

### 3.1.3 Client/User Environment

| Component | Minimum |
|-----------|---------|
| Device | Any device with modern web browser |
| Browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Network | 1 Mbps internet connection |
| Display | 320px width (mobile responsive) |

---

## 3.2 Software Requirements

### 3.2.1 Development Tools

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or above | JavaScript runtime for backend |
| npm | 9.x or above | Package manager |
| VS Code | Latest | Code editor / IDE |
| Git | 2.x | Version control |
| MongoDB Community | 7.x | Database server (optional with fallback) |
| Postman | Latest | API testing |
| Chrome DevTools | Latest | Frontend debugging |

### 3.2.2 Runtime Dependencies

**Backend Dependencies**:

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web server framework |
| mongoose | ^7.6.3 | MongoDB ODM |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| bcrypt | ^2.4.3 | Password hashing |
| cors | ^2.8.5 | Cross-origin resource sharing |
| dotenv | ^16.3.1 | Environment variables |
| nodemailer | ^6.9.7 | Email sending |
| uuid | ^9.0.0 | Unique ID generation |

**Frontend Dependencies**:

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI component library |
| react-dom | ^18.2.0 | React DOM rendering |
| react-router-dom | ^6.20.1 | Client-side routing |
| axios | ^1.6.2 | HTTP client |
| react-icons | ^5.6.0 | Icon library |
| vite | ^5.0.8 | Build tool & dev server |

---

## 3.3 Tools & Technologies Used

### 3.3.1 React.js (v18.2)

**Category**: Frontend UI Library  
**Purpose**: Building interactive, component-based user interfaces with virtual DOM for optimal rendering performance.

**Justification**:
- Component-based architecture ideal for reusable UI elements (cards, steppers, forms)
- Virtual DOM ensures smooth updates in complex multi-step forms
- Hooks API (useState, useEffect, useContext) simplifies state management
- Massive ecosystem of libraries and community support
- React 18's concurrent features improve user experience during heavy operations

**Usage in Project**:
- All UI pages and components (40+ components)
- Context API for global auth state management
- Custom hooks for API calls and form handling
- Conditional rendering for role-based views (user/admin)

### 3.3.2 Vite (v5.0)

**Category**: Frontend Build Tool  
**Purpose**: Lightning-fast development server with Hot Module Replacement (HMR) and optimized production builds.

**Justification**:
- 10-100x faster cold start than Create React App / Webpack
- Instant HMR (sub-50ms updates during development)
- Native ES modules support — no bundling during development
- Optimized production builds with Rollup
- Built-in proxy for API requests during development

**Usage in Project**:
- Development server on port 3000 with proxy to backend (port 5000)
- Production build optimization
- Static asset handling
- Environment variable management (VITE_ prefix)

### 3.3.3 Node.js

**Category**: Backend Runtime  
**Purpose**: Server-side JavaScript execution environment with non-blocking I/O model.

**Justification**:
- Same language (JavaScript) across frontend and backend — reduced context switching
- Event-driven, non-blocking I/O perfect for handling concurrent API requests
- ES Module support for modern import/export syntax
- Mature package ecosystem via npm (2M+ packages)
- Excellent performance for I/O-bound operations (API calls, database queries, file reads)

**Usage in Project**:
- Express server hosting all API endpoints
- JWT token generation and verification
- File system operations for JSON fallback mode
- Async/await patterns for clean asynchronous code

### 3.3.4 Express.js (v4.18)

**Category**: Backend Web Framework  
**Purpose**: Minimal and flexible Node.js web application framework providing HTTP utilities and middleware.

**Justification**:
- De facto standard for Node.js APIs — massive community and documentation
- Middleware architecture for modular request processing (auth, CORS, parsing)
- Lightweight with no opinion on database or templating
- Easy REST API creation with route grouping
- Excellent error handling middleware support

**Usage in Project**:
- RESTful API with 9 route groups (auth, destinations, packages, vendors, bookings, payment, ai, email, admin)
- Middleware pipeline: CORS → JSON parsing → Route matching → Auth verification → Handler
- Static file serving for fallback data
- Error handling middleware

### 3.3.5 MongoDB (v7.6)

**Category**: Database  
**Purpose**: NoSQL document database for flexible, schema-less data storage with powerful queries.

**Justification**:
- JSON-like documents (BSON) — natural fit for JavaScript/Node.js applications
- Flexible schema ideal for varying booking structures (package vs. custom)
- Embedded documents for nested data (guests, timeline, payment history)
- Horizontal scalability for future growth
- Free tier available on MongoDB Atlas for deployment

**Usage in Project**:
- Primary data store for users, bookings, destinations, packages, vendors
- Mongoose ODM for schema validation and model definitions
- Indexed queries for efficient data retrieval
- Aggregation pipelines for admin statistics

### 3.3.6 Mongoose (v7.6.3)

**Category**: ODM (Object Document Mapper)  
**Purpose**: Schema-based modeling for MongoDB, providing validation, middleware, and query building.

**Justification**:
- Type safety and validation at the application layer
- Pre/post hooks for business logic (e.g., password hashing before save)
- Virtual fields and populate for relationships
- Clean query API with chainable methods

**Usage in Project**:
- 5 data models: User, Booking, Destination, Package, Vendor
- Schema validation (required fields, unique constraints, enum values)
- Default values and timestamps

### 3.3.7 JSON Web Token (JWT)

**Category**: Authentication  
**Purpose**: Stateless, compact token-based authentication for securing API endpoints.

**Justification**:
- Stateless — no server-side session storage needed
- Compact — can be stored in localStorage and sent in headers
- Self-contained — carries user claims (id, email, role)
- Standard — widely supported across platforms and libraries

**Usage in Project**:
- Token generation on login (7-day expiry)
- Claims: { id, email, isAdmin }
- Authorization header: `Bearer <token>`
- Protected route middleware verification
- Auto-refresh via `/auth/me` endpoint

### 3.3.8 bcrypt (v2.4.3)

**Category**: Security  
**Purpose**: Password hashing library using adaptive Blowfish algorithm with salt rounds.

**Justification**:
- Industry standard for password storage
- Adaptive — can increase salt rounds as hardware improves
- Built-in salt generation — prevents rainbow table attacks
- Time-tested cryptographic security

**Usage in Project**:
- Password hashing on registration (10 salt rounds)
- Password comparison on login
- Admin password seeding

### 3.3.9 Google Gemini AI (2.5 Flash)

**Category**: Artificial Intelligence  
**Purpose**: Large Language Model for natural language understanding, recommendation generation, and content creation.

**Justification**:
- State-of-the-art language understanding and generation
- JSON mode for structured output (preference extraction)
- Low latency ("Flash" model optimized for speed)
- Cost-effective API pricing
- Supports system instructions for domain-specific behavior

**Usage in Project**:
- Ask Mode: Wedding planning Q&A with context injection
- Agent Mode: Structured preference extraction (temperature: 0.1)
- Timeline Generation: AI-crafted wedding day schedules
- Recommendation formatting with markdown and action links

### 3.3.10 Nodemailer (v6.9.7)

**Category**: Email Service  
**Purpose**: Module for sending transactional emails via SMTP (Gmail).

**Justification**:
- Simple API for HTML email sending
- Built-in Gmail OAuth2/App Password support
- Reliable delivery with retry mechanisms
- HTML template support for branded emails

**Usage in Project**:
- Booking confirmation emails (with payment details)
- Guest invitation emails (with wedding details and RSVP)
- Cancellation notification emails
- Non-blocking async sending (failures don't block booking)

### 3.3.11 Axios (v1.6.2)

**Category**: HTTP Client  
**Purpose**: Promise-based HTTP client for making API requests from the browser.

**Justification**:
- Interceptor support for automatic auth header injection
- Automatic JSON parsing
- Request/Response transformation
- Better error handling than native fetch

**Usage in Project**:
- All frontend API calls to backend
- Request interceptor: auto-attaches JWT from localStorage
- Centralized base URL configuration
- Error response handling

### 3.3.12 React Router DOM (v6.20)

**Category**: Client-Side Routing  
**Purpose**: Declarative routing for React applications with nested routes and navigation guards.

**Justification**:
- Standard routing solution for React SPAs
- Layout routes for shared UI (Navbar persistence)
- Protected route patterns with auth checks
- URL parameter extraction for dynamic pages

**Usage in Project**:
- 15+ routes (public, protected, admin)
- Layout wrapper with persistent Navbar
- Redirect logic for unauthorized access
- Dynamic routing: `/my-weddings/:id`, `/checkout/:bookingId`, `/book-package/:id`

---
