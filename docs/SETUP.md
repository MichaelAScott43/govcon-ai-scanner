# GovCon AI Scanner — Setup Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- MongoDB Atlas account (free) — or a local MongoDB instance
- SAM.gov API key ([register here](https://api.data.gov/signup/))
- Gmail account or SendGrid account (for email digest)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/MichaelAScott43/govcon-ai-scanner.git
cd govcon-ai-scanner
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Random secret (min 32 chars) |
| `SAM_API_KEY` | Yes | Your SAM.gov / api.data.gov key |
| `GMAIL_USER` | Email | Gmail address for digests |
| `GMAIL_PASSWORD` | Email | Gmail App Password |
| `SENDGRID_API_KEY` | Email (alt) | SendGrid API key |
| `PORT` | No | Server port (default: 3000) |

> **Note:** USASpending.gov, SBIR.gov, and Grants.gov are public APIs that do not require API keys.

> **Generate a JWT secret:** `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App passwords

### 3. Install backend dependencies

```bash
npm install
```

### 4. Install and build the React frontend

```bash
npm run build:frontend
```

This runs `cd frontend && npm install && npm run build` and places the production build in `frontend/dist/`.

### 5. Start the server

```bash
npm start
```

The server serves the React app from `frontend/dist/` and exposes the API at `/api/*`.

Open [http://localhost:3000](http://localhost:3000).

---

## Development Mode

Run the backend and frontend dev servers simultaneously with hot-reload:

```bash
# Terminal 1: backend
npm run dev

# Terminal 2: frontend (with Vite HMR)
cd frontend && npm run dev
```

The frontend dev server runs at [http://localhost:5173](http://localhost:5173) and proxies `/api/*` to the backend at port 3000.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in and receive JWT tokens |
| `POST` | `/api/auth/logout` | Invalidate refresh token |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/profile` | Get current user |
| `PATCH` | `/api/auth/profile` | Update name, company, NAICS codes |

### Opportunities

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/opportunities/search` | Search SAM.gov by NAICS / keyword |
| `GET` | `/api/opportunities` | Get user's saved opportunities |
| `POST` | `/api/opportunities/save` | Save an opportunity |
| `POST` | `/api/opportunities/analyze` | Analyze a document (file or text) |
| `GET` | `/api/opportunities/debug` | Validate SAM API connectivity |

### Opportunity Intelligence

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/opportunity-intelligence` | Get latest intelligence report (score, summary, metrics) |
| `POST` | `/api/opportunity-intelligence/refresh` | Re-fetch from all federal databases and return updated analysis |

**Refresh request body (all fields optional):**
```json
{
  "naicsCodes": ["541511", "541512"],
  "daysBack": 30
}
```

**Supported federal databases:**
- **SAM.gov** — federal contract solicitations (requires `SAM_API_KEY`)
- **USASpending.gov** — federal contract awards (public API)
- **SBIR.gov** — Small Business Innovation Research solicitations (public API)
- **Grants.gov** — federal grants (public API)

### Email

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/email-preferences/preferences` | Get email digest preferences |
| `POST` | `/api/email-preferences/preferences/update` | Update preferences |
| `POST` | `/api/email/send-daily-digest` | Send test digest to yourself |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |

---

## Deployment

### Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Build command: `npm install && npm run build:frontend`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`

### Environment variables for production

```
NODE_ENV=production
MONGODB_URI=<your Atlas URI>
JWT_SECRET=<strong random secret>
SAM_API_KEY=<your key>
GMAIL_USER=<your Gmail>
GMAIL_PASSWORD=<app password>
```

---

## File Structure

```
govcon-ai-scanner/
├── server.js                      # Main entry point
├── package.json
├── .env.example
│
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                # JWT verification middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Opportunity.js
│   │   └── EmailPreference.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── opportunities.js
│   │   └── email.js
│   └── services/
│       ├── samGov.js              # SAM.gov API client
│       ├── intelligenceService.js # Multi-source opportunity intelligence
│       ├── bidScoring.js          # FAR/DFARS intelligence engine
│       ├── emailService.js        # Nodemailer / SendGrid
│       └── documentParser.js     # PDF / DOCX / TXT parsing
│
├── intelligence/                  # Python FastAPI intelligence microservice
│   ├── collector.py               # Multi-source collector (SAM.gov, USASpending, SBIR, Grants.gov)
│   ├── analyzer.py                # Metrics: top agencies, NAICS, set-asides, keywords
│   ├── scorer.py                  # Trend score 0–100
│   ├── summarizer.py              # Human-readable summary generation
│   ├── routes.py                  # FastAPI: GET/POST /opportunity-intelligence
│   └── requirements.txt           # Python dependencies
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── index.jsx
│       ├── pages/
│       │   ├── App.jsx
│       │   └── styles.css
│       ├── components/
│       │   ├── LoginPage.jsx      # Login + Registration with both logos
│       │   ├── Dashboard.jsx      # Main dashboard
│       │   ├── Header.jsx
│       │   ├── SearchForm.jsx
│       │   └── AnalysisResults.jsx
│       └── utils/
│           ├── api.js             # Axios API client with auth interceptors
│           └── auth.js            # JWT token storage helpers
│
└── docs/
    └── SETUP.md                   # This file
```
