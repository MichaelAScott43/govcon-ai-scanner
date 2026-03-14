# GovCon AI Scanner v2.0

> AI-powered federal contracting opportunity scanner for government contractors

**Built by [BlackCrest Sourcing Group](https://blackcrestsourcing.com)**

---

## Features

- 🔍 **SAM.gov Opportunity Search** — search by NAICS code, keyword, PSC, set-aside, and date range
- 📄 **Document Analysis** — upload PDF / DOCX or paste text for instant bid/no-bid scoring
- 🎯 **Bid Scoring Engine** — FAR/DFARS intelligence scores each opportunity 0–100
- 📧 **Daily Email Digest** — automated opportunity delivery via Gmail or SendGrid
- 🔐 **JWT Authentication** — secure login / registration with refresh tokens
- 💾 **MongoDB Persistence** — users, saved opportunities, email preferences
- ⚡ **React + Tailwind CSS** — modern responsive frontend with both logos
- 🧠 **Opportunity Intelligence** — cross-database trend analysis across SAM.gov, USASpending.gov, SBIR.gov, and Grants.gov

## Quick Start

```bash
# 1. Install backend dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, SAM API key, and email credentials

# 3. Build frontend
npm run build:frontend

# 4. Start server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Development

```bash
# Backend (with hot-reload)
npm run dev

# Frontend (Vite HMR, in a separate terminal)
cd frontend && npm run dev
```

## Documentation

See [docs/SETUP.md](docs/SETUP.md) for full setup, API reference, and deployment instructions.

## API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login and get JWT |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/profile` | Get current user |
| `POST /api/opportunities/search` | Search SAM.gov by NAICS |
| `POST /api/opportunities/analyze` | Analyze document |
| `GET /api/opportunities` | Get saved opportunities |
| `GET /api/opportunity-intelligence` | Get opportunity intelligence report |
| `POST /api/opportunity-intelligence/refresh` | Refresh from all federal databases |
| `POST /api/email-preferences/preferences/update` | Set email preferences |
| `POST /api/email/send-daily-digest` | Trigger daily email |
| `GET /health` | Health check |

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Nodemailer
- **Frontend:** React 18, React Router, Tailwind CSS, Vite, Axios
- **Services:** SAM.gov OpenGov API, Gmail / SendGrid
- **Monitoring:** Datadog APM (optional)

- **Services:** SAM.gov, USASpending.gov, SBIR.gov, Grants.gov, Gmail / SendGrid
- **Intelligence:** Multi-source NAICS-filtered opportunity analysis with trend scoring (also available as a standalone Python/FastAPI microservice in `intelligence/`)
- **Monitoring:** Datadog APM (optional)

## Pricing & Payments

GovCon AI Scanner includes a **30-day free trial** with full access to all features.

After the trial period, users are directed to upgrade via Stripe:

**Stripe Payment Link:** `https://buy.stripe.com/aFa7sK8peh2l4Up8aVf7i02`

Set this link in your environment:

```env
STRIPE_PAYMENT_LINK=https://buy.stripe.com/aFa7sK8peh2l4Up8aVf7i02
```

## Disclaimer

Designed for Non-Classified Use Only. GovCon AI Scanner provides preliminary analysis and does not replace professional contract review.
