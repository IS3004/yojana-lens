# YojanaLens (योजनालेंस)
> **"Find every scheme you deserve. Verified at the source."**
> *"हर वो योजना जिसके आप हकदार हैं। आधिकारिक स्रोत से सत्यापित।"*

[![Live Frontend](https://img.shields.io/badge/Live%20App-Vercel-black?style=for-the-badge&logo=vercel)](https://yojana-lens.vercel.app/)
[![Live Backend API](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://yojanalens-backend.onrender.com/)
[![Interactive Docs](https://img.shields.io/badge/API%20Docs-Swagger-85EA2D?style=for-the-badge&logo=swagger)](https://yojanalens-backend.onrender.com/docs)

- 🌐 **Live Web Application**: [https://yojana-lens.vercel.app/](https://yojana-lens.vercel.app/)
- ⚙️ **Production API**: [https://yojanalens-backend.onrender.com/](https://yojanalens-backend.onrender.com/)
- 📖 **Swagger API Docs**: [https://yojanalens-backend.onrender.com/docs](https://yojanalens-backend.onrender.com/docs)
- 🗄️ **Database**: Supabase Postgres (Live Grievance Tracker)

YojanaLens is a bilingual (English / Hindi) Indian civic intelligence platform designed to connect citizens with government welfare schemes, debunk fraudulent viral circulars, simplify complex bureaucratic gazette orders, draft administrative petitions for civic grievances, and provide radical transparency into public budget spending.

---

## 🏛️ Core Modules

### 1. Khoj (खोज) — Welfare Scheme Finder
- **Conversational Profile Builder**: Citizens describe their background via text or voice in English, Hindi, or Hinglish (e.g., *"मैं झारखंड का किसान हूँ, 45 साल, 2 एकड़ ज़मीन, BPL परिवार"*).
- **Deterministic Python Rule Engine (`matcher.py`)**: Strict rule evaluation in plain Python; the LLM *never* hallucinates or decides welfare eligibility.
- **"Almost Eligible" (Near-Misses)**: Identifies schemes where exactly 1 condition is unmet and provides code-generated actionable guidance on how to qualify.
- **Deadline Countdown Badges**: Dynamic calculations for application windows (*"Closes in N days"*, amber under 30 days, red under 7 days).
- **Photo Document Prefill**: Privacy-safe multimodal document OCR (Ration Card, Income Certificate, etc.) that pre-fills profile chips without storing citizen ID numbers.
- **WhatsApp Share**: One-click sharing of matched schemes with verified government links.
- **Grounded Scheme Q&A (`POST /ask-scheme`)**: Questions answered strictly using official guidelines and Tavily-retrieved `.gov.in` snippets.

### 2. Parakh (परख) — Claim Checker & Gazette Notice Simplifier
- **Viral Claim Fact-Checking**: Accepts forwarded WhatsApp messages, screenshots, or PDF circulars.
- **Domain Security Audit**: Plain-code link checker flags any URL whose domain does not end in `.gov.in` or `.nic.in`.
- **Grounded Verification**: PIB Fact Check and official gazette evidence search via Tavily. If no official evidence exists, marks as `unverified` without guessing.
- **Notice Simplifier (`POST /simplify`)**: Translates dense legal/bureaucratic notifications into structured action items, deadlines, and scam warnings.
- **Accessibility & Read Aloud**: Built-in speech synthesis (`hi-IN` / `en-IN`) and font-size toggle for neo-literate or elderly citizens.

### 3. Complaints (शिकायतें) — Civic Grievance & Public Administration Drafter
- **Grievance Intake**: Voice and photo attachment support for civic issues (potholes, contaminated water, power outages).
- **AI Classification & Routing**: Maps grievances into categories (`road`, `water`, `sanitation`, `electricity`, `health`, `other`) and routes them to the competent municipal or state department.
- **Formal Administrative Petition**: Generates a respectful, legally-structured grievance letter ready for submission.
- **Locality Duplicate Check**: Employs Python `difflib` similarity algorithms across a 30-day window to alert citizens if similar issues have already been reported nearby.
- **Public Grievance Tracker**: Displays live statuses (`received`, `in_progress`, `resolved`), a days-open counter, and an overdue escalation warning (>15 days).
- **Admin Workflow**: Protected by `X-Admin-Token` to advance resolution statuses.

### 4. Budget & Analytics (बजट एवं प्रभाव) — Public Spending Transparency
- **Open Government Budget Data**: Reads open fiscal datasets (`backend/data/budget_allocations.csv`) and `meta.json` using `pandas`.
- **Sectoral & YoY Analytics**: Sector allocation bar charts, year-over-year trend lines, and top 10 budgetary line items computed strictly in code.
- **Grounded Data Q&A (`POST /budget/ask`)**: Two-step pipeline: Gemini routes the natural question to a pandas aggregation; pandas computes the arithmetic; Gemini phrases the final answer strictly using the computed numbers.
- **"Explain in Simple Words"**: Generates 2-sentence citizen explanations for visualizations without hallucinating numbers.

---

## 🛠️ Architecture & Tech Stack

```
                                    ┌────────────────────────┐
                                    │      React 18 +        │
                                    │   Vite + TailwindCSS   │
                                    │    (Lucide, Recharts)  │
                                    └───────────┬────────────┘
                                                │ REST API / Axios
                                                ▼
                                    ┌────────────────────────┐
                                    │   FastAPI (Python)     │
                                    │  - SlowAPI Rate Limiter│
                                    │  - Pydantic Validation │
                                    └───────────┬────────────┘
                         ┌──────────────────────┼──────────────────────┐
                         ▼                      ▼                      ▼
               ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
               │ Plain-Code Rules  │  │ Google Gemini API │  │ Tavily Search API │
               │   (matcher.py)    │  │ (gemini-2.5-flash)│  │ (pib / gov.in)    │
               └───────────────────┘  └───────────────────┘  └───────────────────┘
                         │                      │                      │
                         ▼                      ▼                      ▼
               ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
               │  Pandas Engine    │  │  Supabase Store   │  │  Open Budget CSV  │
               │ (budget_service)  │  │ (Complaints DB)   │  │   (meta.json)     │
               └───────────────────┘  └───────────────────┘  └───────────────────┘
```

---

## 🗄️ Supabase Database Schema

To set up the Complaints table in your Supabase project, execute the following SQL in the Supabase SQL Editor:

```sql
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null,
  department text not null,
  severity text not null,
  location text not null,
  lang text default 'en',
  status text default 'received',
  formal_draft text,
  duplicates_found text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indices for rapid spatial and category lookups
create index if not exists idx_complaints_location on complaints (location);
create index if not exists idx_complaints_category on complaints (category);
create index if not exists idx_complaints_created_at on complaints (created_at desc);
```

*(Note: If `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are not provided in `.env`, the system automatically falls back to an internal thread-safe in-memory store so the application runs without external dependencies).*

---

## 🗺️ Roadmap: Geospatial Clustering for Civic Grievances

> **Roadmap Note**: As complaint volume expands, location strings will be geocoded using OpenStreetMap Nominatim / ISRO Bhuvan APIs and clustered with DBSCAN or PostGIS `ST_ClusterDBSCAN` to automatically detect neighborhood-level civic infrastructure failures across municipal ward boundaries.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.11 & 3.14)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and supply GEMINI_API_KEY, TAVILY_API_KEY, etc.

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be accessible at: `http://localhost:5173/`

### 4. Running Tests
```bash
# In backend/ with active virtualenv:
python -c "from fastapi.testclient import TestClient; from main import app; c = TestClient(app); print(c.get('/budget/summary').json())"

# In frontend/:
npm run build
```

---

## 🔒 Security & Privacy Commitments
- **Zero Hallucination Eligibility**: Eligibility calculations are executed in Python (`matcher.py`), never delegated to an LLM.
- **Privacy by Design**: ID numbers (Aadhaar, PAN, Ration Card numbers) are stripped during document OCR and never persisted.
- **Domain Verification**: Unofficial domains requesting money or personal credentials are immediately flagged.
- **Prototype Notice**: All screens prominently feature: *"Prototype for information only. Not affiliated with any government portal."*
