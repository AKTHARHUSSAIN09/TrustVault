# TrustVault

**TrustVault** is a role-based web portal for managing the lifecycle of Fixed Deposit Receipts (FDRs) submitted by technical institutions for regulatory review. It brings FDR registration, document scrutiny, renewal and release workflows, auditability, and decision-support tools into one interface.

> **Prototype notice:** This repository is a demonstration/prototype and is not an official AICTE product or service. Do not use it to store real credentials, personally identifiable information, or production financial documents without completing an independent security review and configuring a production backend.

## Highlights

- Role-aware portals for institutional users and reviewing officers
- Central FDR repository with detailed instrument profiles and status tracking
- Guided new-FDR, renewal, replacement, discrepancy, and release/refund workflows
- Document uploads with version lineage and preview support
- Maturity monitoring, notifications, SLA alerts, printable registers, and CSV exports
- Immutable-style audit-log views and hash-chained lifecycle-ledger simulation
- FDR authenticity scoring, bank-template checks, cross-institution fraud graphing, and institution risk radar
- Optional Gemini-assisted document extraction, forensic analysis, risk summaries, and natural-language ledger queries
- Firebase Authentication, Firestore, and Storage integration with accompanying Firestore security rules

## Technology

| Area | Tools |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS |
| Server | Express, tsx |
| Data and identity | Firebase Authentication, Cloud Firestore, Cloud Storage |
| AI assistance | Google Gen AI SDK (Gemini) |
| UI | Lucide icons, Motion |

## Getting started

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Firebase project configured for Authentication, Firestore, and Storage
- A Gemini API key if you want to use the server-side AI-assisted features

### Install and configure

1. Clone the repository and enter it.

   ```bash
   git clone https://github.com/AKTHARHUSSAIN09/TrustVault.git
   cd TrustVault
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file from the example.

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Add your Gemini API key to `.env.local`.

   ```dotenv
   GEMINI_API_KEY="your_gemini_api_key"
   APP_URL="http://localhost:3000"
   ```

5. Configure `firebase-applet-config.json` with your Firebase web-app configuration. This file is imported by `src/firebase.ts`; ensure its project settings point to a Firebase project you control.

6. Start the application.

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Runs the Express server with Vite middleware for development. |
| `npm run build` | Creates the production client build in `dist/`. |
| `npm run start` | Runs the Express server; set `NODE_ENV=production` to serve `dist/`. |
| `npm run preview` | Previews the Vite production build. |
| `npm run lint` | Runs TypeScript type checking without emitting files. |

## AI features and environment variables

The server exposes these Gemini-backed endpoints when `GEMINI_API_KEY` is present:

- `POST /api/gemini/extract-fdr` — extract structured FDR fields from text or a base64 document payload
- `POST /api/gemini/authenticity-scan` — produce a forensic and provenance assessment
- `POST /api/gemini/risk-analysis` — generate an explainable institution-risk brief
- `POST /api/gemini/nlq-search` — interpret natural-language ledger questions

The app also provides `GET /api/health` for a basic service health check.

Never commit `.env.local` or a real API key. The repository ignores `.env*` files except `.env.example`.

## Project structure

```text
src/
  components/        Shared layouts, controls, and detail drawers
  context/           Authentication and application data state
  data/              Deterministic demo data
  pages/             Admin, workflow, governance, intelligence, and institution views
  utils/             Trust scoring, risk, ledger, query, and fraud-graph engines
  firebase.ts        Firebase initialization and Firestore error helpers
server.ts             Express server and Gemini API routes
firestore.rules       Firestore access-control rules
firestore.rules.test.ts  Security-rule test scenarios
security_spec.md      Security invariants and adversarial payload coverage
```

## Security notes

The Firestore policy is designed around authenticated, verified users, role controls, immutable identifiers, schema validation, append-only audit logs, and a default-deny fallback. Review both [`firestore.rules`](firestore.rules) and [`security_spec.md`](security_spec.md) before deploying.

The included data is demonstration data. Verify all authorization rules, Firebase configuration, document-storage controls, logging, monitoring, and compliance obligations for your environment before production use.

## Contributing

1. Create a branch for your change.
2. Make the change and run `npm run lint`.
3. Build with `npm run build`.
4. Open a pull request describing the problem, solution, and validation performed.

## License

No license has been added yet. Add a `LICENSE` file before distributing or accepting external contributions under specific terms.
