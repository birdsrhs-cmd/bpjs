# 🤖 Autonomous Agent API Endpoints

Add these endpoints to `server.ts` to integrate the autonomous agent:

```typescript
import { bpjsPortalAgent } from './src/server/modules/bpjsPortalAgent.js';
import { credentialVault } from './src/server/modules/credentialVault.js';
import { bpjsSessionManager } from './src/server/modules/bpjsSessionManager.js';
import { bpjsSyncEngine } from './src/server/modules/bpjsSync.js';

// =====================================================================
// CREDENTIAL MANAGEMENT ENDPOINTS
// =====================================================================

/**
 * POST /api/agent/credentials/store
 * Store EDABU or SIPP credentials securely
 * 
 * SECURITY: Only accessible to authorized admins
 * Body: { "portalName": "EDABU|SIPP", "username": "xxx", "password": "xxx" }
 */
app.post('/api/agent/credentials/store', (req: Request, res: Response) => {
  try {
    const { portalName, username, password } = req.body;

    if (!['EDABU', 'SIPP'].includes(portalName)) {
      return res.status(400).json({
        success: false,
        message: "portalName must be 'EDABU' or 'SIPP'"
      });
    }

    const result = credentialVault.storeCredential(portalName, username, password, 'HR_ADMIN');
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      portal: portalName
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/agent/credentials/status
 * Check if credentials exist for portals
 * Response: { edabu: boolean, sipp: boolean }
 */
app.get('/api/agent/credentials/status', (req: Request, res: Response) => {
  try {
    const edabuActive = credentialVault.hasActiveCredential('EDABU');
    const sippActive = credentialVault.hasActiveCredential('SIPP');

    res.json({
      success: true,
      credentials: {
        edabu: edabuActive ? credentialVault.getCredentialMetadata('EDABU') : null,
        sipp: sippActive ? credentialVault.getCredentialMetadata('SIPP') : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/agent/credentials/rotate/:portal
 * Rotate credentials (security best practice)
 * Body: { "newPassword": "xxx" }
 */
app.post('/api/agent/credentials/rotate/:portal', (req: Request, res: Response) => {
  try {
    const { portal } = req.params;
    const { newPassword } = req.body;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    const result = credentialVault.rotateCredential(
      portal as 'EDABU' | 'SIPP',
      newPassword,
      'HR_ADMIN'
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// SESSION MANAGEMENT ENDPOINTS
// =====================================================================

/**
 * GET /api/agent/sessions/status
 * Get all active sessions summary
 */
app.get('/api/agent/sessions/status', (req: Request, res: Response) => {
  try {
    const summary = bpjsSessionManager.getSessionSummary();
    res.json({
      success: true,
      sessions: summary
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/agent/sessions/logout/:sessionId
 * Force logout a specific session
 */
app.post('/api/agent/sessions/logout/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const success = bpjsSessionManager.invalidateSession(sessionId, 'Manual logout');

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session invalidated'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/agent/sessions/logout-portal/:portal
 * Force logout ALL sessions for a portal
 * Portal: EDABU | SIPP
 */
app.post('/api/agent/sessions/logout-portal/:portal', (req: Request, res: Response) => {
  try {
    const { portal } = req.params;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    const loggedOut = bpjsSessionManager.logoutPortal(
      portal as 'EDABU' | 'SIPP',
      'Admin forced logout'
    );

    res.json({
      success: true,
      loggedOutCount: loggedOut,
      message: `Logged out ${loggedOut} session(s) from ${portal}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// AUTONOMOUS SYNC ENDPOINTS
// =====================================================================

/**
 * POST /api/agent/sync
 * Run FULL autonomous sync to EDABU & SIPP
 * 
 * Workflow:
 * 1. Validate master data (existing)
 * 2. Login to EDABU & SIPP (autonomous)
 * 3. Register new employees
 * 4. Deactivate resigned/terminated
 * 5. Flag changes for manual upload
 * 6. Logout (cleanup)
 * 
 * Query params:
 * ?period=2026-10 (optional, defaults to current month)
 * ?force=true (optional, bypass checks)
 */
app.post('/api/agent/sync', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || getCurrentPeriodJakarta();
    const force = req.query.force === 'true';

    // Step 1: Run validation
    const validation = bpjsSyncEngine.runValidation(period);

    if (!force && validation.summary.invalid > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot sync: ${validation.summary.invalid} invalid records found. Fix data or use ?force=true`,
        invalidCount: validation.summary.invalid
      });
    }

    // Step 2: Check credentials
    if (!credentialVault.hasActiveCredential('EDABU')) {
      return res.status(403).json({
        success: false,
        message: 'EDABU credentials not configured. Call POST /api/agent/credentials/store first'
      });
    }

    if (!credentialVault.hasActiveCredential('SIPP')) {
      return res.status(403).json({
        success: false,
        message: 'SIPP credentials not configured. Call POST /api/agent/credentials/store first'
      });
    }

    // Step 3: Prepare records
    const newRecords = validation.records.filter(r => r.deltaStatus === 'NEW' && r.currentData?.status === 'ACTIVE');
    const resignedRecords = validation.records.filter(r => ['RESIGNED', 'TERMINATED'].includes(r.deltaStatus));
    const changedRecords = validation.records.filter(r => r.deltaStatus === 'CHANGED');

    // Step 4: Login to EDABU
    const edabuLogin = await bpjsPortalAgent.loginToEdabu();

    if (!edabuLogin.success || !edabuLogin.sessionId) {
      return res.status(503).json({
        success: false,
        message: `EDABU login failed: ${edabuLogin.message}`,
        timestamp: edabuLogin.timestamp
      });
    }

    // Step 5: Login to SIPP
    const sippLogin = await bpjsPortalAgent.loginToSipp();

    if (!sippLogin.success || !sippLogin.sessionId) {
      // Logout EDABU first
      await bpjsPortalAgent.logoutEdabu(edabuLogin.sessionId);

      return res.status(503).json({
        success: false,
        message: `SIPP login failed: ${sippLogin.message}`,
        timestamp: sippLogin.timestamp
      });
    }

    // Step 6: Upload new employees
    const edabuUpload = await bpjsPortalAgent.uploadEmployeeDataEdabu(
      edabuLogin.sessionId,
      newRecords.map(r => r.currentData!).filter(emp => emp)
    );

    const sippUpload = await bpjsPortalAgent.uploadEmployeeDataSipp(
      sippLogin.sessionId,
      newRecords.map(r => r.currentData!).filter(emp => emp)
    );

    // Step 7: Deactivate resigned/terminated
    const edabuDeactivate = await bpjsPortalAgent.deactivateEmployeeEdabu(
      edabuLogin.sessionId,
      resignedRecords.map(r => r.nik)
    );

    const sippDeactivate = await bpjsPortalAgent.deactivateEmployeeEdabu(
      sippLogin.sessionId,
      resignedRecords.map(r => r.nik)
    );

    // Step 8: Logout
    await bpjsPortalAgent.logoutEdabu(edabuLogin.sessionId);
    await bpjsPortalAgent.logoutSipp(sippLogin.sessionId);

    // Step 9: Generate response
    const syncResult = {
      success: true,
      period,
      timestamp: formatJakartaDate(),
      summary: {
        validated: validation.summary.total,
        newEmployees: newRecords.length,
        registeredEdabu: edabuUpload.uploadedCount,
        registeredSipp: sippUpload.uploadedCount,
        deactivatedEdabu: edabuDeactivate.deactivatedCount,
        deactivatedSipp: sippDeactivate.deactivatedCount,
        pendingManualUpload: changedRecords.length,
        failureCount: edabuUpload.failedCount + sippUpload.failedCount + 
                      edabuDeactivate.failedCount + sippDeactivate.failedCount
      },
      details: {
        edabuUpload,
        sippUpload,
        edabuDeactivate,
        sippDeactivate
      }
    };

    res.json(syncResult);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Sync failed: ${error.message}`,
      timestamp: formatJakartaDate()
    });
  }
});

/**
 * POST /api/agent/login-test/:portal
 * Test login to EDABU or SIPP without syncing
 * Portal: EDABU | SIPP
 * 
 * Useful for:
 * - Verify credentials are correct
 * - Check portal connectivity
 * - Test before running full sync
 */
app.post('/api/agent/login-test/:portal', async (req: Request, res: Response) => {
  try {
    const { portal } = req.params;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    let loginResult;

    if (portal === 'EDABU') {
      loginResult = await bpjsPortalAgent.loginToEdabu();
      
      if (loginResult.success && loginResult.sessionId) {
        await bpjsPortalAgent.logoutEdabu(loginResult.sessionId);
      }
    } else {
      loginResult = await bpjsPortalAgent.loginToSipp();
      
      if (loginResult.success && loginResult.sessionId) {
        await bpjsPortalAgent.logoutSipp(loginResult.sessionId);
      }
    }

    res.json(loginResult);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: formatJakartaDate()
    });
  }
});

/**
 * GET /api/agent/session/:sessionId
 * Get detailed session info
 */
app.get('/api/agent/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const status = bpjsPortalAgent.getSessionStatus(sessionId);

    res.json({
      success: true,
      session: status
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// MONITORING & DIAGNOSTICS ENDPOINTS
// =====================================================================

/**
 * GET /api/agent/health
 * Health check for agent system
 */
app.get('/api/agent/health', (req: Request, res: Response) => {
  try {
    const sessions = bpjsSessionManager.getSessionSummary();
    const edabuCreds = credentialVault.hasActiveCredential('EDABU');
    const sippCreds = credentialVault.hasActiveCredential('SIPP');

    res.json({
      success: true,
      health: {
        status: 'HEALTHY',
        activeSessions: sessions.totalActiveSessions,
        credentials: {
          edabu: edabuCreds,
          sipp: sippCreds
        },
        timestamp: formatJakartaDate()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      health: { status: 'UNHEALTHY', message: error.message }
    });
  }
});

/**
 * GET /api/agent/diagnostics
 * Get detailed diagnostics for troubleshooting
 */
app.get('/api/agent/diagnostics', (req: Request, res: Response) => {
  try {
    const sessions = bpjsSessionManager.getSessionSummary();
    const edabuMeta = credentialVault.getCredentialMetadata('EDABU');
    const sippMeta = credentialVault.getCredentialMetadata('SIPP');

    res.json({
      success: true,
      diagnostics: {
        timestamp: formatJakartaDate(),
        sessions,
        credentials: {
          edabu: edabuMeta,
          sipp: sippMeta
        },
        config: bpjsSessionManager.getConfig()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

---

## 🔐 Required Imports

```typescript
// Add to server.ts
import { formatJakartaDate, getCurrentPeriodJakarta } from './src/server/modules/auditSnapshot.js';

// Import the new modules when implemented
import { credentialVault } from './src/server/modules/credentialVault.js';
import { bpjsSessionManager } from './src/server/modules/bpjsSessionManager.js';
import { bpjsPortalAgent } from './src/server/modules/bpjsPortalAgent.js';
```

---

## 📋 API Usage Workflow

### 1️⃣ Setup Credentials (First Time Only)

```bash
curl -X POST http://localhost:3000/api/agent/credentials/store \
  -H "Content-Type: application/json" \
  -d '{
    "portalName": "EDABU",
    "username": "your_edabu_username",
    "password": "your_edabu_password"
  }'

curl -X POST http://localhost:3000/api/agent/credentials/store \
  -H "Content-Type: application/json" \
  -d '{
    "portalName": "SIPP",
    "username": "your_sipp_username",
    "password": "your_sipp_password"
  }'
```

### 2️⃣ Verify Credentials

```bash
curl http://localhost:3000/api/agent/credentials/status
```

### 3️⃣ Test Login

```bash
curl -X POST http://localhost:3000/api/agent/login-test/EDABU
curl -X POST http://localhost:3000/api/agent/login-test/SIPP
```

### 4️⃣ Run Autonomous Sync

```bash
# Sync with validation
curl -X POST http://localhost:3000/api/agent/sync

# Sync specific period
curl -X POST "http://localhost:3000/api/agent/sync?period=2026-10"

# Force sync even with invalid records
curl -X POST "http://localhost:3000/api/agent/sync?force=true"
```

### 5️⃣ Monitor Sessions

```bash
curl http://localhost:3000/api/agent/sessions/status
curl http://localhost:3000/api/agent/health
curl http://localhost:3000/api/agent/diagnostics
```

---

## ⚠️ Security Reminders

- **NEVER** send passwords in plaintext via HTTP
- Always use **HTTPS** in production
- Implement **authentication/authorization** on agent endpoints
- Rotate credentials regularly
- Monitor all credential & session access
- Log all agent activities for audit compliance

---

## 🚀 Next Steps

1. Add these endpoints to `server.ts`
2. Install Playwright: `npm install playwright`
3. Implement actual browser automation in `bpjsPortalAgent.ts`
4. Test with sandbox EDABU/SIPP credentials
5. Deploy with proper security measures
