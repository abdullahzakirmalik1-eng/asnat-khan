# Asnat Khan — Portfolio & Creative Studio

A modern, high-converting portfolio and agency website for **Asnat Khan** (Creative Lead & Brand Architect). Built with clean HTML5 semantic structure, bespoke CSS animations, dynamic client-side interactions, secure client authentication, an end-to-end interactive order and checkout system, and a Vercel serverless backend powered by Supabase and Stripe.

---

## 🌟 Key Features

### 1. Dynamic Showcase & Editorial Pages
- `index.html` — Hero section, client proofs, core service pillars, interactive testimonials, and CTA banners.
- `founder-story.html` — Background story, design philosophy, leadership journey, and media features.
- `services.html` — Comprehensive breakdown of services (Brand Identity, UI/UX Design, Creative Direction, Web Development) with direct package-selection actions.
- `get-quote.html` — Multi-step dynamic inquiry builder with live cost estimation and real-time validation.

### 2. Client Authentication Portal
- `login.html` — Sleek, branded client sign-in with return URL redirection, password visibility toggles, and live validation.
- `register.html` — New client onboarding with real-time password strength, matching feedback, and instant routing.
- `forgot-password.html` & `reset-password.html` — Secure self-service password recovery flow.
- `verify-email.html` — Email verification confirmation screen with automatic check timers.
- `js/auth/` architecture:
  - `validation.js` — Client-side validation for email, password rules, password match, and names.
  - `return-path.js` — Whitelist sanitization and defense against open-redirect vulnerabilities.
  - `auth-interface.js` — Provider boundary abstraction supporting Firebase and Supabase Auth.
  - `auth-ui.js` — Accessible DOM controller handling form states, errors, and authentication life cycles.

### 3. Interactive Order & Checkout Engine
- `order.html` — Interactive package selection (Basic $50, Standard $100, E-Commerce $200), add-on services (extra products at $1/ea, pitch deck design, article writing), real-time pricing calculator, and project briefing form.
- `checkout.html` — Order summary review, billing contact information, and payment gateway selection (Stripe Checkout & instant Test Mode verification).
- `order-confirmation.html` — Post-payment verification screen, order reference breakdown, tokenized security verification, and next kickoff steps.

### 4. Serverless Backend APIs
- `/api/quote` — Records customer inquiry submissions into Supabase table `quote_inquiries`.
- `/api/order` — Validates order details, recalculates pricing server-side, generates unique references (`AK-YYYYMMDD-XXXX`) and access tokens, and saves orders to Supabase `orders` table.
- `/api/checkout` — Generates Stripe Checkout sessions or simulates verified test mode payments.
- `/api/verify` — Validates order payment status via order ID, access token, or Stripe session reference.
- `/api/webhook` — Secure Stripe webhook receiver handling asynchronous `checkout.session.completed` events.

### 5. Local Dev Server (`serve.ps1`)
- Zero-dependency PowerShell HTTP server for Windows local preview and full API testing.
- Clean URL routing (`/order`, `/checkout`, `/order-confirmation`, `/login`, `/register`, etc.).
- Built-in local fallbacks saving inquiries to `quote_inquiries.json` and orders to `orders.json` when Supabase is unreachable.

---

## 🚀 Running Locally

### Option 1: PowerShell Dev Server (Recommended for Windows)

Run the local server script:
```powershell
npm run dev
# or directly:
powershell -ExecutionPolicy Bypass -File ./serve.ps1
```
Open your browser at:
```
http://localhost:8090
```

### Option 2: Node / Any Static Server

Install dependencies:
```bash
npm install
```

If you use Vercel CLI locally:
```bash
vercel dev
```

---

## 🧪 Testing

The repository includes end-to-end automated test suites:

### 1. Authentication Test Suite
Tests input validation, open-redirect defense, provider interfaces, and HTTP route accessibility:
```bash
node test_auth.js
```

### 2. Ordering & Payment Flow Test Suite
Tests server-side pricing recalculation, order creation, token retrieval, checkout execution, and payment verification:
```powershell
powershell -ExecutionPolicy Bypass -File ./test_flow.ps1
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Configure **Environment Variables** in Vercel Project Settings:
   - `SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your Supabase anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`: (Optional) Your Supabase service role key
   - `STRIPE_SECRET_KEY`: (Optional) Stripe Secret Key for live checkout
   - `STRIPE_PUBLISHABLE_KEY`: (Optional) Stripe Publishable Key
   - `STRIPE_WEBHOOK_SECRET`: (Optional) Stripe Webhook signing secret
4. Deploy! Vercel will automatically detect `vercel.json` and deploy both static pages and serverless API endpoints.

---

## 📁 Project Structure

```
├── api/
│   ├── checkout.js              # Stripe Checkout session creation & test execution
│   ├── order.js                 # Order creation & retrieval endpoint
│   ├── quote.js                 # Quote submission endpoint
│   ├── verify.js                # Payment verification endpoint
│   └── webhook.js               # Stripe webhook listener
├── assets/
│   └── images/                  # High-resolution optimized portraits and assets
├── css/
│   └── styles.css               # Complete responsive design system & order/auth styling
├── js/
│   ├── auth/
│   │   ├── auth-interface.js    # Auth provider abstraction layer
│   │   ├── auth-ui.js           # Form handling & interactive UI bindings
│   │   ├── return-path.js       # Return URL sanitizer & open-redirect protector
│   │   └── validation.js        # Form validation rules & helpers
│   ├── checkout.js              # Checkout page controller
│   ├── main.js                  # Frontend interactions & animations
│   ├── packages.js              # Package definitions & calculation engine
│   └── supabase.js              # Client-side Supabase configuration
├── checkout.html                # Checkout & billing contact page
├── forgot-password.html         # Password reset request page
├── founder-story.html           # Founder bio & editorial story
├── get-quote.html               # Interactive multi-step quote builder
├── index.html                   # Home page & showcase
├── login.html                   # Client sign-in portal
├── order.html                   # Interactive package & customization configurator
├── order-confirmation.html      # Post-payment order receipt & verification page
├── register.html                # Client registration portal
├── reset-password.html          # Password reset confirmation page
├── verify-email.html            # Email verification confirmation page
├── package.json                 # Project metadata & npm dependencies
├── serve.ps1                    # Zero-dependency local development server
├── test_auth.js                 # Authentication test suite
├── test_flow.ps1                # Order & payment integration test suite
├── vercel.json                  # Vercel deployment & rewrite configuration
└── .gitignore                   # Ignored files (node_modules, logs, secrets, local DBs)
```
