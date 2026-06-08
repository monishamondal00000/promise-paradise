# Chapter 10: Database Design

## 10.1 MongoDB Schema Design

Promise Paradise uses MongoDB with Mongoose ODM for schema validation. The database design follows a document-oriented approach optimized for the application's read-heavy workload.

### Design Principles:
- **Embedding over References**: Guest lists, timelines, and payment history are embedded within bookings (reducing joins)
- **Denormalization**: Package includes vendor IDs directly (no separate join collection)
- **Flexible Schema**: Bookings vary significantly between package and custom types
- **String IDs**: Custom readable IDs (PP-XXX for bookings, dest-N, pkg-N, v-N) for user-friendliness

### Collections Overview:

| Collection | Document Count | Avg Doc Size | Primary Key |
|-----------|---------------|-------------|-------------|
| users | Dynamic | ~200 bytes | id (UUID) |
| bookings | Dynamic | ~2-5 KB | id (PP + 10 chars) |
| destinations | 50+ | ~1 KB | id (dest-N) |
| packages | 20+ | ~500 bytes | id (pkg-N) |
| vendors | 80+ | ~400 bytes | id (v-N) |

---

## 10.2 Collections & Relationships

### Relationship Diagram:

```
users (1) ────────────── (N) bookings
                              │
                              ├── references → destinations (N:1)
                              ├── references → packages (N:1, optional)
                              └── references → vendors (N:M, via ID array)

packages (N) ─── references → destinations (1)
packages (N) ─── references → vendors (M, via ID array)
```

### Relationship Types:

| Relationship | Type | Implementation |
|-------------|------|---------------|
| User → Bookings | One-to-Many | booking.userId = user.id |
| Booking → Destination | Many-to-One | booking.destinationId = dest.id |
| Booking → Package | Many-to-One | booking.packageId = pkg.id (nullable) |
| Booking → Vendors | Many-to-Many | booking.selectedVendors = [vendor.id, ...] |
| Package → Destination | Many-to-One | package.destination = dest.id |
| Package → Vendors | Many-to-Many | package.vendors = [vendor.id, ...] |

### Query Patterns:

| Query | Frequency | Index Needed |
|-------|-----------|-------------|
| Get user by email | Login (high) | email (unique) |
| Get bookings by userId | Dashboard (high) | userId |
| Get all destinations | Browse (high) | None (full scan OK for 50 docs) |
| Get packages by destinationId | Filter (medium) | destination |
| Get booking by id | Detail view (medium) | id (unique) |

---

## 10.3 JSON Fallback Store Implementation

### Architecture:

```
backend/
└── data/
    ├── destinations.json    (50+ records, ~150 KB)
    ├── packages.json        (20+ records, ~30 KB)
    ├── vendors.json         (80+ records, ~50 KB)
    ├── users.json           (dynamic, starts with admin)
    ├── bookings.json        (dynamic, starts empty [])
    ├── chats.json           (dynamic, starts {})
    └── payments.json        (dynamic, starts empty [])
```

### Read/Write Operations:

```javascript
// Reading - synchronous file read with BOM handling
export function readJSON(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const clean = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(clean);
}

// Writing - synchronous write with pretty formatting
export function writeJSON(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
```

### Operation Mapping (MongoDB → JSON):

| MongoDB Operation | JSON Equivalent |
|------------------|-----------------|
| `Model.find()` | `readJSON(name)` |
| `Model.find({ field: val })` | `readJSON(name).filter(d => d.field === val)` |
| `Model.findOne({ id })` | `readJSON(name).find(d => d.id === id)` |
| `new Model(data).save()` | `arr.push(data); writeJSON(name, arr)` |
| `Model.findOneAndUpdate()` | Find index, merge updates, writeJSON |
| `Model.findOneAndDelete()` | Filter out, writeJSON |
| `Model.countDocuments()` | `readJSON(name).length` |

---

## 10.4 Data Seeding Strategy

### Seed Script (`seed.js`):

The project includes a seeding script that populates the database with initial data:

```javascript
// seed.js - Populates MongoDB with JSON data
import { connectDB } from './db/connect.js';
import Destination from './models/Destination.js';
import Package from './models/Package.js';
import Vendor from './models/Vendor.js';
import { readJSON } from './utils/jsonStore.js';

async function seed() {
  await connectDB();
  
  // Clear existing data
  await Destination.deleteMany({});
  await Package.deleteMany({});
  await Vendor.deleteMany({});
  
  // Load from JSON files
  const destinations = readJSON('destinations');
  const packages = readJSON('packages');
  const vendors = readJSON('vendors');
  
  // Insert into MongoDB
  await Destination.insertMany(destinations);
  await Package.insertMany(packages);
  await Vendor.insertMany(vendors);
  
  console.log('Database seeded successfully');
}
```

### Admin Seeding (`utils/seedAdmin.js`):

On every server startup, the system ensures an admin account exists:

```javascript
export async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || 'adminpp@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'pp@12345';
  
  // Check if admin exists
  const existing = await getUserByEmail(adminEmail);
  if (existing) return;
  
  // Create admin
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await createUser({
    id: uuid(),
    name: 'Admin',
    email: adminEmail,
    passwordHash,
    phone: '',
    isAdmin: true,
    createdAt: new Date().toISOString()
  });
}
```

---

## 10.5 Sample Data Overview

### Destinations (Sample):

| ID | Name | Country | Price/Day | International | Sub-Places |
|----|------|---------|-----------|---------------|------------|
| dest-1 | Udaipur | India | ₹1,50,000 | No | 4 (Palace, Lake, Fort, Garden) |
| dest-2 | Jaipur | India | ₹1,20,000 | No | 4 (Palace, Fort, Garden, Haveli) |
| dest-3 | Goa | India | ₹1,00,000 | No | 4 (Beach, Resort, Hilltop, Cruise) |
| dest-10 | Bali | Indonesia | ₹2,00,000 | Yes | 3 (Beach, Cliff, Rice Terrace) |
| dest-15 | Santorini | Greece | ₹3,50,000 | Yes | 3 (Cliffside, Winery, Beach) |

### Packages (Sample):

| ID | Name | Destination | Price | Tier | Duration | Guests |
|----|------|-------------|-------|------|----------|--------|
| pkg-1 | Royal Rajputana | dest-1 | ₹25,00,000 | premium | 3 days | 200-400 |
| pkg-5 | Beach Bliss | dest-3 | ₹8,00,000 | standard | 2 days | 100-200 |
| pkg-10 | Grand Palace | dest-2 | ₹15,00,000 | premium | 3 days | 150-300 |
| pkg-15 | Budget Bliss | dest-8 | ₹3,50,000 | budget | 1 day | 50-100 |
| pkg-20 | Luxury Escape | dest-10 | ₹55,00,000 | luxury | 5 days | 100-200 |

### Vendors (Sample):

| ID | Name | Category | Price Range | Rating | City |
|----|------|----------|-------------|--------|------|
| v-1 | Royal Lens Studios | Photography | ₹1,50,000 - ₹5,00,000 | 4.8 | Udaipur |
| v-10 | Spice Route Catering | Catering | ₹800 - ₹2,500 (per plate) | 4.6 | Mumbai |
| v-20 | Floral Dreams | Decoration | ₹2,00,000 - ₹8,00,000 | 4.7 | Jaipur |
| v-30 | Beat Box Entertainment | Entertainment | ₹3,00,000 - ₹10,00,000 | 4.5 | Delhi |

---

## 10.6 Chat Storage Design

### Structure:

```json
{
  "user_abc123": {
    "ask": [
      { "role": "user", "content": "Show me beach destinations", "ts": "2026-05-23T10:00:00Z" },
      { "role": "assistant", "content": "Here are our beach...", "ts": "2026-05-23T10:00:01Z" }
    ],
    "agent": [
      { "role": "assistant", "content": "Welcome! Tell me about...", "ts": "2026-05-23T11:00:00Z" },
      { "role": "user", "content": "Royal wedding, 200 guests...", "ts": "2026-05-23T11:00:05Z" }
    ],
    "agentState": {
      "phase": "pre_recommend",
      "preferences": { "budget": 3000000, "vibe": "royal", "guestCount": 200 }
    }
  }
}
```

### Constraints:
- Maximum 50 messages per user per mode
- Older messages trimmed when limit exceeded
- Agent state persists between sessions
- Reset command clears state and history for that mode

---
