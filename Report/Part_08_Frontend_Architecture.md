# Chapter 8: Frontend Architecture & UI/UX

## 8.1 React Component Hierarchy

```
<App>
├── <AuthProvider>                    (Global auth context)
│   ├── <Router>
│   │   ├── <Layout>                 (Persistent Navbar wrapper)
│   │   │   ├── <Navbar />           (Navigation + auth state)
│   │   │   └── <Routes>
│   │   │       ├── <Landing />              (Public homepage)
│   │   │       ├── <Login />                (Auth form)
│   │   │       ├── <Register />             (Auth form)
│   │   │       ├── <Gallery />              (Public gallery)
│   │   │       ├── <Dashboard />            (Protected)
│   │   │       ├── <Packages />             (Package explorer)
│   │   │       ├── <PackageFlow />          (Multi-step booking)
│   │   │       │   └── <Stepper />
│   │   │       ├── <CustomFlow />           (Multi-step planning)
│   │   │       │   └── <Stepper />
│   │   │       ├── <Bookings />             (Booking list)
│   │   │       ├── <BookingDetail />        (Single booking view/edit)
│   │   │       ├── <Payment />              (Checkout page)
│   │   │       ├── <AIAssistant />          (AI Concierge page)
│   │   │       │   ├── <AIChat />           (Ask mode component)
│   │   │       │   └── <AgentChat />        (Agent mode component)
│   │   │       ├── <Profile />              (User settings)
│   │   │       └── <Admin />                (Admin panel)
│   │   └── <Toast />               (Global notification)
│   │   └── <ConfirmPopup />        (Confirmation dialogs)
```

---

## 8.2 Routing Structure

### Route Definitions:

```javascript
// Public Routes (no authentication required)
/                    → <Landing />
/login               → <Login />
/register            → <Register />
/wedding-gallery     → <Gallery />
/explore-packages    → <Packages />

// Protected Routes (requires valid JWT)
/dashboard           → <Dashboard />
/my-weddings         → <Bookings />
/my-weddings/:id     → <BookingDetail />
/book-package/:id?   → <PackageFlow />
/plan-wedding        → <CustomFlow />
/checkout/:bookingId → <Payment />
/wedding-concierge   → <AIAssistant />
/profile             → <Profile />

// Admin Routes (requires JWT + isAdmin)
/admin               → <Admin />

// Redirects (legacy URLs)
/packages            → /explore-packages
/bookings            → /my-weddings
```

### Route Protection Logic:
```javascript
// Protected route wrapper
if (!user && !loading) {
  redirect to /login with return URL
}
// Admin route wrapper  
if (!user?.isAdmin) {
  redirect to /dashboard
}
```

---

## 8.3 State Management (Context API)

### AuthContext:

```javascript
// context/AuthContext.jsx
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount: check localStorage for token
    const token = localStorage.getItem('pp_token');
    if (token) {
      // Call /api/auth/me to validate token & get user
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => { ... };
  const register = async (name, email, phone, password) => { ... };
  const logout = () => {
    localStorage.removeItem('pp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Local State Patterns:
- **Multi-step forms**: useState for current step, form data object, validation errors
- **API data**: useState + useEffect for fetching on mount
- **UI state**: Loading spinners, modals, toast notifications
- **localStorage**: Timeline templates, agent state backup

---

## 8.4 Responsive Design & Styling

### Approach:
- **CSS**: Custom CSS with CSS variables for theming
- **Layout**: Flexbox and CSS Grid for responsive layouts
- **Breakpoints**: Mobile-first with desktop enhancements
- **Theme**: Wedding-inspired palette (beige, gold, soft white, accent colors)

### Color Palette:
```css
--primary: #D4A574       /* Warm gold */
--primary-dark: #B8845C  /* Deep gold */
--secondary: #F5E6D3     /* Soft beige */
--text: #2C1810          /* Dark brown */
--background: #FFF8F0    /* Cream */
--accent: #8B4513        /* Saddle brown */
--success: #4CAF50       /* Green */
--error: #E74C3C         /* Red */
```

### Responsive Features:
- Navbar: Hamburger menu on mobile
- Cards: Grid columns reduce on smaller screens (3 → 2 → 1)
- Forms: Stack vertically on mobile
- Stepper: Compact mode on small screens
- Tables: Scrollable on mobile

---

## 8.5 Stepper-Based Multi-Step Forms

### Component: `Stepper.jsx`

A reusable stepper component used in both Package Flow and Custom Flow:

```
Step 1          Step 2          Step 3          Step 4
  ●───────────────●───────────────○───────────────○
Select          Customize       Timeline        Review
Package         Details                         & Book
```

### Features:
- Visual progress indicator with active/completed/pending states
- Step labels with icons
- Forward/back navigation
- Validation before proceeding to next step
- Keyboard-friendly (Enter to proceed)
- Animated transitions between steps

### Step Validation:
- Each step defines required fields
- Cannot proceed without completing current step
- Previous steps remain editable (back navigation)
- Final step shows complete summary before submission

---

## 8.6 Key UI Screens Description

### 8.6.1 Landing Page
- **Hero Section**: Full-width carousel with 4 wedding images (auto-rotate 5s)
- **Parallax Effect**: Background images scroll at different speed
- **Stats Bar**: "50+ Destinations", "500+ Weddings Planned", "80+ Vendors", "4.9/5 Rating"
- **Destination Cards**: Random selection of 3-4 destinations with images
- **Testimonials**: Auto-rotating customer reviews (8 testimonials)
- **CTA Buttons**: "Start Planning", "Explore Packages", "Talk to AI Concierge"

### 8.6.2 Dashboard
- **Greeting**: Time-based ("Good Morning/Afternoon/Evening, [Name]")
- **Summary Cards**: Total bookings, Total investment, Available destinations
- **Quick Start**: Links to start Custom Flow or browse packages
- **Active Bookings**: Preview of up to 5 bookings with status
- **Spending Overview**: Breakdown of expenditure across bookings

### 8.6.3 AI Concierge Page
- **Mode Toggle**: Switch between "Ask" and "Agent" tabs
- **Chat Interface**: Message bubbles (user right, AI left)
- **Markdown Rendering**: Rich formatting with clickable pp:// links
- **Action Buttons**: Quick-action suggestions below AI messages
- **History**: Persistent chat history per mode per user

### 8.6.4 Admin Panel
- **Dashboard Tab**: Stats cards + charts
- **Management Tabs**: Destinations, Packages, Vendors, Bookings, Users
- **CRUD Interface**: Table view with Add/Edit/Delete actions
- **JSON Editor**: Advanced edit mode for complex data structures
- **Confirmation Dialogs**: Before destructive actions

### 8.6.5 Payment/Checkout Page
- **Booking Summary**: Destination, date, guests, package/custom details
- **Amount Display**: Total, Paid, Remaining
- **Payment Type Selector**: Full / Partial (30%) / Remaining balance
- **Payment Form**: Card details (simulated)
- **Confirmation**: Success message with transaction ID and email notification

---
