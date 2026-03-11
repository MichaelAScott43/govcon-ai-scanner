# GovCon AI Proposal Scanner

AI-assisted analysis tool for government contracting documents.

This tool helps proposal teams quickly analyze RFPs, contracts, subcontract language, and procurement text to identify:

- Proposal requirements
- FAR / DFARS indicators
- Flowdown obligations
- Bid and execution risks
- Questions that should be resolved before bidding

## Features

- Upload **PDF, DOCX, or TXT** solicitation documents
- AI-powered proposal intelligence analysis
- Drag-and-drop document upload
- Structured proposal risk report
- Downloadable analysis report

## Use Cases

GovCon AI is designed for:

- Small and mid-sized government contractors
- Proposal managers
- Contracts teams
- Capture managers
- Business development teams

The tool helps teams understand opportunity risk **before investing time in writing a proposal**.

## Important Notice

Designed for **Non-Classified Use Only**.

Do not upload:
- Classified information
- Controlled Unclassified Information (CUI)
- ITAR/EAR controlled technical data
- Export-controlled materials

This tool is intended for general proposal preparation and document analysis.

## Technology Stack

- Node.js
- Express
- OpenAI API
- Multer (file uploads)
- pdf-parse
- Mammoth (DOCX extraction)

## Local Setup

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
# Then edit .env and set SAM_API_KEY=<your_key>
```

Get a free SAM.gov API key at <https://api.data.gov/signup/>, then request access to the SAM.gov Opportunities API.

Start the development server:

```bash
npm run dev
```

## Deploying to Render

> **Why can't Render read my `SAM_API_KEY`?**
>
> The `.env` file is listed in `.gitignore` and is **never committed to the repository**.
> Render deploys by cloning the repo, so it will not find a `.env` file automatically.
> You must add every required environment variable directly in the Render dashboard.

### Steps

1. Push this repository to GitHub (if you haven't already).
2. Go to [render.com](https://render.com) → **New +** → **Web Service** and connect your repo.
3. Render will detect `render.yaml` automatically and pre-populate the service settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In the **Environment** tab (or during setup), add the following environment variable:

   | Key | Value |
   |-----|-------|
   | `SAM_API_KEY` | Your SAM.gov API key |

   > **Security**: Never paste your API key into `render.yaml` or any file that is committed to source control. Always use the Render dashboard's **Environment Variables** section.

5. Click **Create Web Service**. Render will build and deploy the app.

On startup the server logs `✅ SAM_API_KEY is configured.` if the key is found, or a `⚠️  WARNING` with instructions if it is missing. Check the Render **Logs** tab if SAM search isn't working.
