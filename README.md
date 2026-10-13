# Asnat Khan — Portfolio & Creative Studio

A modern, high-converting portfolio and agency website for **Asnat Khan** (Creative Lead & Brand Architect). Built with clean HTML5 semantic structure, bespoke CSS animations, dynamic client-side interactions, and a Vercel serverless backend powered by Supabase.

---

## 🌟 Key Features

- **Dynamic Showcase & Portfolio Pages**:
  - `index.html` — Hero section, client proofs, core service pillars, interactive testimonials, and CTA banners.
  - `founder-story.html` — Background story, design philosophy, leadership journey, and media features.
  - `services.html` — Comprehensive breakdown of services (Brand Identity, UI/UX Design, Creative Direction, Web Development).
  - `get-quote.html` — Multi-step dynamic inquiry builder with live cost estimation and real-time validation.
- **Serverless API (`/api/quote`)**:
  - Production-ready serverless function running on Vercel Node.js runtime.
  - Automatically records quote submissions into Supabase table `quote_inquiries`.
  - Supports CORS and robust payload error handling.
- **Local Dev Server (`serve.ps1`)**:
  - Zero-dependency PowerShell HTTP server for local preview and testing.
  - Clean URL routing (`/services`, `/founder-story`, `/get-quote`).
  - Local quote fallback saving to `quote_inquiries.json`.
- **Preconfigured for Vercel**:
  - `vercel.json` with clean URLs, trailing slash handling, API route mappings, and asset caching headers.

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

## ☁️ Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Configure the following **Environment Variables** in Vercel Project Settings (optional, pre-configured fallbacks exist in code):
   - `SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your Supabase anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`: (Optional) Your Supabase service role key for elevated server-side access
4. Deploy! Vercel will automatically detect `vercel.json` and deploy both the static frontend and the `/api/quote` serverless function.

---

## 🗄️ Database Architecture (Supabase)

Inquiries submitted through the quote builder are captured in `public.quote_inquiries`:
- `id` (bigint, auto-generated)
- `name` (text)
- `email` (text)
- `business` (text)
- `website` (text)
- `project_type` (text)
- `services` (text[])
- `description` (text)
- `package` (text)
- `budget` (text)
- `timeline` (text)
- `received_at` (timestamptz)
- `submitted_at` (timestamptz)

Row Level Security (RLS) is enabled with insert permissions for website visitors.

---

## 📁 Project Structure

```
├── api/
│   └── quote.js                 # Vercel serverless function for quote submissions
├── assets/
│   └── images/                  # High-resolution optimized assets and portraits
├── css/
│   └── styles.css               # Complete responsive design system
├── js/
│   ├── main.js                  # Frontend interactions, animations, and forms
│   └── supabase.js              # Client-side Supabase configuration
├── index.html                   # Home page
├── founder-story.html           # Founder bio & editorial story
├── services.html                # Detailed services catalogue
├── get-quote.html               # Interactive multi-step quote builder
├── package.json                 # Project metadata & npm dependencies
├── serve.ps1                    # Zero-dependency local development server
├── vercel.json                  # Vercel deployment configuration
└── .gitignore                   # Ignored files (node_modules, logs, secrets)
```
