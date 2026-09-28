# 🚀 BPJS Autonomous Agent - Complete Implementation Guide

**Date:** 28 September 2026  
**Status:** Ready for Development & Testing  

---

## 📋 TABLE OF CONTENTS

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [Integration Steps](#integration-steps)
6. [Testing & Validation](#testing--validation)
7. [Deployment Checklist](#deployment-checklist)
8. [Troubleshooting](#troubleshooting)

---

## ⚡ QUICK START

### For Developers
```bash
# 1. Copy new modules to your project
cp -r src/server/modules/* your-project/src/server/modules/

# 2. Install dependencies
npm install playwright dotenv

# 3. Add to environment variables
echo 'CREDENTIAL_MASTER_KEY=your-secure-master-key-32-chars' >> .env.local

# 4. Implement browser automation in bpjsPortalAgent.ts
# (See "Browser Automation Template" section below)

# 5. Add API endpoints from AGENT_API_ENDPOINTS.md to server.ts

# 6. Test with sandbox credentials
npm run dev
curl -X POST http://localhost:3000/api/agent/login-test/EDABU
```

### For Production Deployment
```bash
# 1. Set up secure vault (AWS Secrets Manager / HashiCorp Vault)
# 2. Configure environment variables
# 3. Enable HTTPS & authentication
# 4. Run security audit
# 5. Deploy with monitoring
# 6. Set up alerting
```

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     BPJS Sync Manager                        │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼───────┐ ┌──▼──────────┐ ┌┴─────────────────┐
        │  Master Data  │ │  Validation │ │  Autonomous      │
        │  Management   │ │  & Delta    │ │  Agent           │
        │               │ │  Detection  │ │                  │
        └───────┬───────┘ └──┬──────────┘ └┬─────────────────┘
                │             │             │
                │             └─────┬───────┘
                │                   │
        ┌───────▼───────────────────▼──────────────┐
        │    New Modules (Agent Infrastructure)    │
        ├────────────────────────────────────────┤
        │  1. credentialVault.ts                  │
        │     - AES-256 encryption                │
        │     - Secure credential storage         │
        │     - Audit logging                     │
        ├────────────────────────────────────────┤
        │  2. bpjsSessionManager.ts               │
        │     - Session lifecycle management      │
        │     - Token refresh                     │
        │     - Timeout handling                  │
        ├────────────────────────────────────────┤
        │  3. bpjsPortalAgent.ts                  │
        │     - Playwright integration            │
        │     - Browser automation                │
        │     - Login & upload orchestration      │
        └───────┬──────────────────┬──────────────┘
                │                  │
        ┌───────▼──────┐  ┌────────▼─────────┐
        │  EDABU       │  │  SIPP Online     │
        │  (BPJS       │  │  (BPJS           │
        │  Kesehatan)  │  │  Ketenagakerjaan)│
        └──────────────┘  └──────────────────┘
```

### Data Flow

```
HR Master Data
      │
      ▼
[Validation & Delta Detection]
      │
      ├─► NEW employees → Prepare for registration
      ├─► CHANGED fields → Generate manual Excel
      └─► RESIGNED/TERMINATED → Prepare for deactivation
      │
      ▼
[Autonomous Agent]
      │
      ├─► Login to EDABU & SIPP (credentialVault + sessionManager)
      │
      ├─► Upload NEW:
      │   ├─ EDABU: Register via portal/API
      │   └─ SIPP: Register via portal/API
      │
      ├─► Deactivate RESIGNED/TERMINATED:
      │   ├─ EDABU: Mark as inactive
      │   └─ SIPP: Mark as inactive
      │
      └─► Logout & Cleanup
            ├─ End sessions
            └─ Generate report
```

---

## 📦 INSTALLATION & SETUP

### Prerequisites

```
Node.js >= 16
npm >= 8
TypeScript 5+
```

### Step 1: Install Dependencies

```bash
npm install playwright dotenv crypto-js
npm install --save-dev @types/node
```

**Package.json additions:**

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "dotenv": "^17.2.3"
  }
}
```

### Step 2: Environment Variables

Create `.env.local` (git-ignored):

```bash
# Master encryption key (MUST be 32+ characters, random)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CREDENTIAL_MASTER_KEY=your-32-char-hex-string-here

# Optional: For production vault integration
VAULT_ADDR=https://vault.yourdomain.com
VAULT_TOKEN=your-vault-token
VAULT_SECRET_PATH=secret/bpjs-credentials
```

### Step 3: Generate Master Key

```bash
# Run this in Node REPL or bash:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy output to .env.local as CREDENTIAL_MASTER_KEY
```

---

## ⚙️ CONFIGURATION

### Session Configuration

Edit `bpjsSessionManager.ts` constructor to adjust:

```typescript
private config: SessionConfig = {
  sessionDurationMinutes: 60,      // 1 hour max session
  inactivityTimeoutMinutes: 30,    // 30 min inactivity logout
  tokenRefreshThresholdMinutes: 10, // Refresh 10 min before expiry
  maxConcurrentSessions: 3         // Max 3 concurrent sessions per portal
};
```

### Retry Configuration

Edit `bpjsPortalAgent.ts` constructor:

```typescript
private maxRetries: number = 3;           // Number of retry attempts
private retryDelayMs: number = 1000;      // Initial retry delay (1 second)
// Exponential backoff: 1s → 2s → 4s
```

### Playwright Configuration

Edit `bpjsPortalAgent.ts` browser launch:

```typescript
const browser = await chromium.launch({
  headless: true,              // Headless mode (no UI)
  timeout: 30000,              // 30 second timeout
  args: [
    '--disable-gpu',
    '--single-process'
  ]
});
```

---

## 🔧 INTEGRATION STEPS

### Step 1: Copy Module Files

```bash
# Copy to your project
cp src/server/modules/credentialVault.ts your-project/src/server/modules/
cp src/server/modules/bpjsSessionManager.ts your-project/src/server/modules/
cp src/server/modules/bpjsPortalAgent.ts your-project/src/server/modules/
```

### Step 2: Add Imports to `server.ts`

```typescript
import { credentialVault } from './src/server/modules/credentialVault.js';
import { bpjsSessionManager } from './src/server/modules/bpjsSessionManager.js';
import { bpjsPortalAgent } from './src/server/modules/bpjsPortalAgent.js';
import { formatJakartaDate } from './src/server/modules/auditSnapshot.js';
```

### Step 3: Add API Endpoints

Copy all endpoints from `AGENT_API_ENDPOINTS.md` to `server.ts` before `startServer()` call.

### Step 4: Implement Browser Automation

Edit `src/server/modules/bpjsPortalAgent.ts` and replace TODO sections:

#### Example: EDABU Login Automation

```typescript
import { chromium } from 'playwright';

async loginToEdabu(): Promise<LoginResult> {
  try {
    // Get credentials
    const credentials = credentialVault.getCredential('EDABU', 'BPJS_AGENT');
    if (!credentials) throw new Error('Credentials not found');

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Navigate to login page
      await page.goto('https://edabu.bpjskesehatan.go.id/');

      // Wait for login form
      await page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Fill credentials
      await page.fill('input[name="username"]', credentials.username);
      await page.fill('input[name="password"]', credentials.password);

      // Check for CAPTCHA
      const captchaElement = await page.$('div.g-recaptcha');
      if (captchaElement) {
        // Handle CAPTCHA - alert user for manual completion
        auditSnapshotStore.addAuditLog({
          nik: 'SYSTEM',
          nama: 'EDABU Agent',
          action: 'CAPTCHA_REQUIRED',
          old_value: '-',
          new_value: '-',
          status: 'PENDING_MANUAL_ACTION',
          source: 'BPJS_AGENT',
          user_or_system: 'BPJS_AGENT'
        });
        
        throw new Error('CAPTCHA required - manual intervention needed');
      }

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });

      // Check for success
      const errorMsg = await page.$('.alert-danger');
      if (errorMsg) {
        throw new Error('Login failed - invalid credentials');
      }

      // Extract session cookie
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'PHPSESSID' || c.name === 'sessionid');

      // Create session
      const { sessionId } = bpjsSessionManager.createSession(
        'EDABU',
        credentials.username,
        undefined,
        undefined,
        'Playwright/BPJS-Agent',
        'localhost'
      );

      await browser.close();

      return {
        success: true,
        sessionId,
        message: 'Successfully logged in to EDABU',
        timestamp: formatJakartaDate()
      };

    } finally {
      await browser.close();
    }

  } catch (error: any) {
    // Error handling...
    return {
      success: false,
      message: `Login failed: ${error.message}`,
      timestamp: formatJakartaDate()
    };
  }
}
```

#### Example: Employee Upload

```typescript
async uploadEmployeeDataEdabu(
  sessionId: string,
  employees: Employee[]
): Promise<UploadResult> {
  const errors: Array<{ nik: string; name: string; error: string }> = [];
  let uploadedCount = 0;

  try {
    // Verify session
    const session = bpjsSessionManager.getSession(sessionId);
    if (!session) throw new Error('Session expired');

    // Retry each employee upload
    for (const emp of employees) {
      try {
        const success = await this.retryWithBackoff(
          async () => {
            // Navigate to employee registration form
            // await page.goto('https://edabu.bpjskesehatan.go.id/register');

            // Fill form fields
            // await page.fill('input[name="nik"]', emp.nik);
            // await page.fill('input[name="nama"]', emp.name);
            // ... etc

            // Submit
            // await page.click('button[type="submit"]');
            // await page.waitForNavigation();

            // Verify success
            // const successMsg = await page.$('.alert-success');
            // return !!successMsg;

            return true; // Placeholder
          },
          `Upload employee ${emp.nik}`
        );

        if (success) {
          uploadedCount++;
        } else {
          errors.push({
            nik: emp.nik,
            name: emp.name,
            error: 'Upload failed - unknown error'
          });
        }

      } catch (err: any) {
        errors.push({
          nik: emp.nik,
          name: emp.name,
          error: err.message
        });
      }

      // Update activity to keep session alive
      bpjsSessionManager.updateActivity(sessionId);
    }

    return {
      success: errors.length === 0,
      uploadedCount,
      failedCount: errors.length,
      errors,
      message: `Uploaded ${uploadedCount}/${employees.length} employees`,
      timestamp: formatJakartaDate()
    };

  } catch (error: any) {
    return {
      success: false,
      uploadedCount: 0,
      failedCount: employees.length,
      errors: employees.map(e => ({
        nik: e.nik,
        name: e.name,
        error: error.message
      })),
      message: `Upload failed: ${error.message}`,
      timestamp: formatJakartaDate()
    };
  }
}
```

### Step 5: Test the Implementation

```bash
npm run dev
```

Test endpoints:
```bash
# 1. Store credentials
curl -X POST http://localhost:3000/api/agent/credentials/store \
  -H "Content-Type: application/json" \
  -d '{"portalName":"EDABU","username":"test","password":"test123"}'

# 2. Test login
curl -X POST http://localhost:3000/api/agent/login-test/EDABU

# 3. Check status
curl http://localhost:3000/api/agent/health
```

---

## 🧪 TESTING & VALIDATION

### Unit Tests

Create `src/server/modules/__tests__/credentialVault.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { credentialVault } from '../credentialVault';

describe('CredentialVault', () => {
  it('should store and retrieve encrypted credentials', () => {
    const result = credentialVault.storeCredential('EDABU', 'testuser', 'password123');
    expect(result.success).toBe(true);

    const retrieved = credentialVault.getCredential('EDABU');
    expect(retrieved?.username).toBe('testuser');
    expect(retrieved?.password).toBe('password123');
  });

  it('should reject weak passwords', () => {
    const result = credentialVault.storeCredential('EDABU', 'testuser', 'short');
    expect(result.success).toBe(false);
  });

  it('should handle encryption/decryption correctly', () => {
    credentialVault.storeCredential('SIPP', 'user@sipp', 'SecurePass999!');
    const creds = credentialVault.getCredential('SIPP');
    expect(creds?.password).toBe('SecurePass999!');
  });
});
```

### Integration Tests

Create `src/server/modules/__tests__/bpjsPortalAgent.test.ts`:

```typescript
describe('BPJSPortalAgent', () => {
  beforeEach(() => {
    // Store test credentials
    credentialVault.storeCredential('EDABU', 'test_user', 'test_pass_123');
  });

  it('should handle login with valid credentials', async () => {
    const result = await bpjsPortalAgent.loginToEdabu();
    expect(result.success).toBe(true);
    expect(result.sessionId).toBeDefined();
  });

  it('should handle login failures gracefully', async () => {
    credentialVault.disableCredential('EDABU');
    const result = await bpjsPortalAgent.loginToEdabu();
    expect(result.success).toBe(false);
  });

  it('should manage sessions correctly', async () => {
    const login = await bpjsPortalAgent.loginToEdabu();
    const session = bpjsSessionManager.getSession(login.sessionId!);
    expect(session?.status).toBe('ACTIVE');
  });
});
```

### Manual Testing Checklist

- [ ] Store EDABU credentials
- [ ] Store SIPP credentials
- [ ] Verify credentials via `/api/agent/credentials/status`
- [ ] Test EDABU login via `/api/agent/login-test/EDABU`
- [ ] Test SIPP login via `/api/agent/login-test/SIPP`
- [ ] Check sessions via `/api/agent/sessions/status`
- [ ] Run validation via `/api/bpjs/validate`
- [ ] Run full sync via `/api/agent/sync` (test mode)
- [ ] Verify audit logs
- [ ] Check EDABU & SIPP for new registrations
- [ ] Test credential rotation
- [ ] Test session timeout
- [ ] Test concurrent sessions

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment Security Review

- [ ] All credentials encrypted at rest
- [ ] Master encryption key stored securely (not in code)
- [ ] HTTPS enabled in production
- [ ] API authentication implemented
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (if using DB)
- [ ] CSRF protection enabled
- [ ] Audit logging comprehensive
- [ ] Error messages don't leak sensitive info
- [ ] Secrets not in version control
- [ ] .env files in .gitignore
- [ ] Security headers configured

### Production Deployment

1. **Set Environment Variables**
   ```bash
   export CREDENTIAL_MASTER_KEY="your-secure-key"
   export NODE_ENV=production
   ```

2. **Configure Vault (Recommended)**
   - Use AWS Secrets Manager or HashiCorp Vault
   - Rotate credentials every 90 days
   - Enable MFA for vault access

3. **Enable Monitoring**
   ```bash
   npm install winston sentry
   ```

4. **Test in Staging First**
   - Use BPJS sandbox/test environment
   - Run full test suite
   - Load test with realistic data

5. **Deploy with Rollback Plan**
   - Use blue-green deployment
   - Have rollback procedure ready
   - Keep previous version available

6. **Post-Deployment**
   - Monitor logs & errors
   - Verify all endpoints working
   - Check audit trail
   - Get HR sign-off
   - Document any issues

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. "CREDENTIAL_MASTER_KEY not set"

**Problem:** Environment variable missing

**Solution:**
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local
CREDENTIAL_MASTER_KEY=generated-key-here

# Restart server
npm run dev
```

#### 2. "Credentials not found in vault"

**Problem:** Credentials never stored

**Solution:**
```bash
# Call store endpoint first
curl -X POST http://localhost:3000/api/agent/credentials/store \
  -H "Content-Type: application/json" \
  -d '{"portalName":"EDABU","username":"xxx","password":"xxx"}'
```

#### 3. "Session expired"

**Problem:** Session older than 60 minutes or 30 min inactive

**Solution:**
- Re-login before sync
- Or call `/api/agent/sync` which auto-logins

#### 4. "CAPTCHA required"

**Problem:** EDABU/SIPP portal has CAPTCHA protection

**Solution:**
- Option 1: Request BPJS admin to disable CAPTCHA for API user
- Option 2: Implement 2Captcha / Anti-Captcha service
- Option 3: Manual intervention required

#### 5. Login Success but Upload Fails

**Problem:** Login works but portal forms changed

**Solution:**
- Check portal HTML structure
- Update CSS selectors in browser automation
- Take screenshot for debugging: `await page.screenshot();`

#### 6. "Connection timeout"

**Problem:** Portal unreachable or slow

**Solution:**
- Increase timeout: `waitForNavigation({ timeout: 60000 })`
- Check internet connectivity
- Verify BPJS portal is up
- Try from different IP

### Debug Mode

Enable debug logging:

```bash
# In credentialVault.ts
console.log('🔐 Vault operation:', operation, result);

# In bpjsSessionManager.ts
console.log('📋 Session:', sessionId, session.status);

# In bpjsPortalAgent.ts
await page.screenshot({ path: `logs/screenshot-${Date.now()}.png` });
console.log('🌐 Page HTML:', await page.content());
```

### Getting Help

If stuck:

1. Check **audit logs**: `/api/bpjs/audit-logs`
2. Review **session status**: `/api/agent/diagnostics`
3. Check **browser screenshots**: `logs/screenshots/`
4. Review **server logs**: Terminal output
5. Test portal **manually** via browser
6. Contact **BPJS support** for portal issues

---

## 📞 SUPPORT & CONTACT

- **Technical Questions:** Review audit logs & error messages
- **BPJS Portal Issues:** Contact BPJS directly
- **Security Concerns:** Implement immediately, audit later
- **Feature Requests:** Document & prioritize

---

## 📚 REFERENCE DOCUMENTS

- `AUDIT_REPORT_AND_PLAN.md` - Detailed audit & architecture
- `AGENT_API_ENDPOINTS.md` - Complete API documentation
- `IMPLEMENTATION_GUIDE.md` - This file

---

## 🎯 SUCCESS CRITERIA

✅ **Agent is working correctly when:**

1. Credentials stored securely (encrypted at rest)
2. Sessions created/maintained/cleaned up automatically
3. Login to EDABU & SIPP successful
4. NEW employees registered in both portals
5. RESIGNED/TERMINATED employees deactivated
6. CHANGED employees flagged for manual upload
7. Complete audit trail recorded
8. No security vulnerabilities
9. <5 minute downtime for deployment
10. HR can run sync once per month without issues

---

## 🚀 NEXT STEPS

1. ✅ **Review** audit report & architecture
2. ✅ **Install** dependencies & setup environment
3. ⏭️ **Implement** browser automation with actual EDABU/SIPP URLs
4. ⏭️ **Test** with sandbox credentials
5. ⏭️ **Deploy** to staging environment
6. ⏭️ **Validate** with live test data
7. ⏭️ **Production** deployment with monitoring
8. ⏭️ **Monitor** & optimize ongoing

---

**Implementation Status:** Ready for Development  
**Last Updated:** 28 September 2026  
**Prepared by:** Claude AI Assistant
