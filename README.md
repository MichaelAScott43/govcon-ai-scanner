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

## Pricing & Payments

GovCon AI Scanner includes a **30-day free trial** with full access to all features.

After the trial period, users are directed to upgrade via Stripe:

**Stripe Payment Link:** `https://buy.stripe.com/aFa7sK8peh2l4Up8aVf7i02`

Set this link in your environment:

```env
STRIPE_PAYMENT_LINK=https://buy.stripe.com/aFa7sK8peh2l4Up8aVf7i02
```

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
