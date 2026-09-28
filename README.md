# 🤖 BPJS Autonomous Agent - Complete Implementation Package

**Date:** September 2026  
**Version:** 1.0.0  
**Status:** ✅ Production-Ready Implementation & Interactive Web Portal  

Autonomous data synchronization, credential vault, session monitor, and compliance manager for **BPJS Kesehatan (EDABU)** and **BPJS Ketenagakerjaan (SIPP Online)**.

---

## 📦 Repository Structure

The repository structure is organized as follows:

```
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (node_modules, .env.local, .vault_master_key, logs)
├── .gitattributes           # Git path attributes
├── README.md                 # System overview and operational guide
├── package.json              # Dependencies, scripts, and module definitions
├── tsconfig.json             # TypeScript compiler configuration (ESNext, Bundler)
├── vite.config.ts            # Vite + React + Tailwind CSS configuration
├── index.html                # Web Application entry point (Port 3000)
├── server.ts                 # Full-stack Express backend & Vite SPA server
├── run-agent.ts              # CLI test runner for autonomous operations
│
├── src/                      # Source Code
│   ├── main.tsx              # React client initialization
│   ├── App.tsx               # Main portal application component
│   ├── index.css             # Tailwind CSS imports & global styles
│   ├── types.ts              # Core TypeScript interface definitions
│   ├── credentialVault.ts    # AES-256-GCM Credential Vault with PBKDF2
│   ├── bpjsSessionManager.ts # Portal session lifecycle, timeouts, & token refresh
│   ├── bpjsPortalAgent.ts    # Playwright browser automation & challenge hooks
│   ├── auditSnapshot.ts      # Immutable compliance audit log (Asia/Jakarta WIB)
│   ├── employeeStore.ts      # Master employee repository & delta classifier
│   ├── bpjsSyncEngine.ts     # Business rules & regulatory validation engine
│   └── components/           # Interactive Web UI Components
│       ├── Header.tsx        # Top navigation & system health badge
│       ├── RunnerView.tsx    # Live sync orchestrator & console stream
│       ├── EmployeeDeltaView.tsx # Master data roster & BPJS delta inspector
│       ├── VaultView.tsx     # Credential vault management & password rotation
│       ├── SessionView.tsx   # Active session monitor & policy editor
│       ├── AuditView.tsx     # Regulatory audit ledger & compliance export
│       └── ApiExplorerView.tsx # Interactive test bench for all 15+ REST endpoints
│
└── docs/                     # Architecture & Integration Guides
    ├── 00_DELIVERABLES_SUMMARY.md
    ├── 01_AUDIT_REPORT_AND_PLAN.md
    ├── 02_AGENT_API_ENDPOINTS.md
    ├── 03_IMPLEMENTATION_GUIDE.md
    └── 04_ROADMAP_AND_NEXT_STEPS.md
```

---

## 🚀 Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Configure Environment & Master Key
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

#### 🔐 `CREDENTIAL_MASTER_KEY` Security Management
- **In Development**: If `CREDENTIAL_MASTER_KEY` is not supplied, the vault creates a persistent key file `.vault_master_key` with strict read permissions (`0600`), ensuring your encrypted credentials survive server restarts. The raw key is **never logged** to standard output or the browser console.
- **In Production**: Set a permanent 32-byte hex key injected via an enterprise secret manager:
  - AWS Secrets Manager (`AWS_SECRET_NAME`)
  - HashiCorp Vault (`VAULT_ADDR` & `VAULT_TOKEN`)
  - Google Cloud Secret Manager or Kubernetes Secrets

Generate a 256-bit key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Place it into `.env.local` (which is excluded by `.gitignore` and must **never** be committed to Git).

---

## 💻 Running the Application

### Option A: Interactive Web Dashboard & REST API (Recommended)
Start the unified server on **Port 3000**:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access:
- **Agent Runner & Console**: Trigger full sync cycles, test EDABU/SIPP logins, and inspect real-time log streams.
- **Master Data & Delta Engine**: Validate 16-digit NIKs, BPJS Kesehatan numbers (13 digits), and KPJ (11 digits).
- **Credential Vault**: Encrypt, store, rotate, and backup government portal credentials.
- **Session Monitor**: Inspect active tokens, expiry countdowns, and force logout per portal.
- **Compliance Audit Ledger**: Filter transaction logs by status, actor, and Jakarta timestamp.
- **API Explorer**: Send live test requests to all 15+ REST endpoints with one-click `curl` snippets.

### Option B: Autonomous Agent CLI
Run the standalone CLI runner directly using `tsx`:
```bash
npm run agent:cli
# Or directly:
npx tsx run-agent.ts
```

---

## 🛡️ Security, CAPTCHA, and Regulatory Considerations

### 1. CAPTCHA & reCAPTCHA Handling
Government portals (EDABU and SIPP Online) frequently deploy visual and behavioral CAPTCHA challenges during login:
- **Assisted Mode (Human-in-the-Loop)**: When a CAPTCHA challenge is detected, the agent raises a `CAPTCHA_CHALLENGE` event via `bpjsPortalAgent.submitCaptchaSolution()`. An operator can solve the prompt via the dashboard or webhook callback.
- **Automated Solving**: For headless production setups, integration with authorized solving services (e.g. 2Captcha, Anti-Captcha) or BPJS official APIs can be configured.

### 2. 2FA / OTP Verification
Periodic security upgrades on EDABU and SIPP may mandate SMS or Email OTP verification:
- The agent implements `bpjsPortalAgent.submitOtpVerification(portalName, sessionId, otpCode)` to inject verification codes without aborting the pending sync queue.

### 3. Concurrent Session Restrictions
EDABU and SIPP Online enforce strict single-session limits per login account. Opening concurrent sessions with the same username causes previous sessions to be kicked out.
- `bpjsSessionManager` monitors active sessions and provides `logoutPortal()` to cleanly terminate stale sessions before dispatching new sync jobs.

### 4. Legal Authorization & BPJS Bridging API
- **Official Bridging API Preferred**: Organizations with high employee volumes should establish a formal **PKS (Perjanjian Kerja Sama)** with BPJS Kesehatan and BPJS Ketenagakerjaan to access official REST/Web Service Bridging APIs.
- **Terms of Service**: Automated web scraping of government portals without written enterprise consent may violate portal terms. Always ensure compliance with Indonesian data protection laws (UU Perlindungan Data Pribadi No. 27/2022).

---

## 📋 REST API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/agent/health` | System health, active sessions count, and vault status |
| `GET` | `/api/agent/diagnostics` | Telemetry, memory statistics, and runtime details |
| `GET` | `/api/agent/credentials/status` | Active credentials metadata (no passwords exposed) |
| `POST` | `/api/agent/credentials/store` | Store encrypted credentials (`AES-256-GCM` + `PBKDF2`) |
| `POST` | `/api/agent/credentials/rotate/:portal` | Rotate portal password with new salt and IV |
| `GET` | `/api/agent/credentials/export-backup` | Export encrypted base64 backup payload |
| `POST` | `/api/agent/login-test/:portal` | Test independent handshake to EDABU or SIPP |
| `POST` | `/api/agent/sync` | Full autonomous sync (`?period=YYYY-MM&force=true`) |
| `GET` | `/api/agent/sessions/status` | Active session tokens and countdown timers |
| `POST` | `/api/agent/sessions/logout/:sessionId` | Invalidate specific active session |
| `POST` | `/api/agent/sessions/logout-portal/:portal` | Flush all active sessions for a portal |
| `GET/POST` | `/api/agent/sessions/config` | View or adjust timeout and concurrency policies |
| `GET` | `/api/agent/employees` | Master employee dataset |
| `GET` | `/api/agent/validate` | Pre-flight validation against BPJS regulatory rules |
| `GET` | `/api/agent/audit/logs` | Query audit trail with Asia/Jakarta timestamps |
| `GET` | `/api/agent/audit/summary` | Summary counts of transaction states |
| `GET` | `/api/agent/live-logs` | Live agent execution console event stream |

---

## 📜 Compliance & License
Developed for enterprise HR data synchronization under authorized organizational procedures. All transactions are logged with immutable audit trails.
