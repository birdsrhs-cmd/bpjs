import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure master key
if (!process.env.CREDENTIAL_MASTER_KEY) {
  process.env.CREDENTIAL_MASTER_KEY = crypto.randomBytes(32).toString('hex');
  console.log('🔑 Generated in-memory CREDENTIAL_MASTER_KEY for this session.');
}

import { credentialVault } from './src/credentialVault.ts';
import { bpjsSessionManager } from './src/bpjsSessionManager.ts';
import { bpjsPortalAgent } from './src/bpjsPortalAgent.ts';
import { auditSnapshotStore, formatJakartaDate, getCurrentPeriodJakarta } from './src/auditSnapshot.ts';
import { employeeStore, EmployeeRecord } from './src/employeeStore.ts';
import { bpjsSyncEngine } from './src/bpjsSyncEngine.ts';

// Pre-seed demo credentials if not already stored
if (!credentialVault.hasActiveCredential('EDABU')) {
  credentialVault.storeCredential(
    'EDABU',
    process.env.EDABU_USERNAME || 'bpjs_demo_corp',
    process.env.EDABU_PASSWORD || 'Kesehatan@Secure2026',
    'INITIAL_SYSTEM_BOOTSTRAP'
  );
}

if (!credentialVault.hasActiveCredential('SIPP')) {
  credentialVault.storeCredential(
    'SIPP',
    process.env.SIPP_USERNAME || 'sipp_corp_admin',
    process.env.SIPP_PASSWORD || 'Ketenagakerjaan@2026Secure',
    'INITIAL_SYSTEM_BOOTSTRAP'
  );
}

// In-memory live event log for interactive runner terminal
interface LiveLogMessage {
  id: string;
  timestamp: string;
  portal?: 'EDABU' | 'SIPP' | 'VAULT' | 'SYSTEM' | 'ENGINE';
  level: 'info' | 'warn' | 'error' | 'success' | 'step';
  message: string;
  details?: any;
}

const liveAgentLogs: LiveLogMessage[] = [
  {
    id: 'init-1',
    timestamp: formatJakartaDate(),
    portal: 'SYSTEM',
    level: 'info',
    message: 'BPJS Autonomous Agent engine initialized & ready for dispatch.'
  },
  {
    id: 'init-2',
    timestamp: formatJakartaDate(),
    portal: 'VAULT',
    level: 'success',
    message: 'Credential Vault loaded with AES-256-GCM encryption & PBKDF2 derivation.'
  }
];

function broadcastLog(portal: 'EDABU' | 'SIPP' | 'VAULT' | 'SYSTEM' | 'ENGINE', level: 'info' | 'warn' | 'error' | 'success' | 'step', message: string, details?: any) {
  const entry: LiveLogMessage = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: formatJakartaDate(),
    portal,
    level,
    message,
    details
  };
  liveAgentLogs.push(entry);
  if (liveAgentLogs.length > 500) {
    liveAgentLogs.shift();
  }
  return entry;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// =====================================================================
// LIVE LOGS ENDPOINT
// =====================================================================
app.get('/api/agent/live-logs', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  res.json({
    success: true,
    logs: liveAgentLogs.slice(-limit)
  });
});

app.post('/api/agent/live-logs/clear', (req: Request, res: Response) => {
  liveAgentLogs.length = 0;
  broadcastLog('SYSTEM', 'info', 'Console logs cleared by operator.');
  res.json({ success: true, message: 'Logs cleared' });
});

// =====================================================================
// CREDENTIAL MANAGEMENT ENDPOINTS
// =====================================================================

app.post('/api/agent/credentials/store', (req: Request, res: Response) => {
  try {
    const { portalName, username, password, operator = 'HR_ADMIN' } = req.body;

    if (!['EDABU', 'SIPP'].includes(portalName)) {
      return res.status(400).json({
        success: false,
        message: "portalName must be 'EDABU' or 'SIPP'"
      });
    }

    const result = credentialVault.storeCredential(portalName, username, password, operator);

    if (!result.success) {
      broadcastLog('VAULT', 'error', `Failed to store credentials for ${portalName}: ${result.message}`);
      return res.status(400).json({ success: false, message: result.message });
    }

    broadcastLog('VAULT', 'success', `Encrypted credentials stored for ${portalName} (User: ${username})`);

    res.json({
      success: true,
      message: result.message,
      portal: portalName
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

app.post('/api/agent/credentials/rotate/:portal', (req: Request, res: Response) => {
  try {
    const portal = req.params.portal as string;
    const { newPassword, operator = 'HR_ADMIN' } = req.body;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal. Must be EDABU or SIPP' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const result = credentialVault.rotateCredential(
      portal as 'EDABU' | 'SIPP',
      newPassword,
      operator
    );

    if (result.success) {
      broadcastLog('VAULT', 'success', `Credential rotated for ${portal} by ${operator}`);
    } else {
      broadcastLog('VAULT', 'warn', `Credential rotation failed for ${portal}: ${result.message}`);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/credentials/disable/:portal', (req: Request, res: Response) => {
  try {
    const portal = req.params.portal as string;
    const { reason = 'Manual disable requested', operator = 'SECURITY_OFFICER' } = req.body;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    const result = credentialVault.disableCredential(portal as 'EDABU' | 'SIPP', reason, operator);
    broadcastLog('VAULT', 'warn', `Credential disabled for ${portal}. Reason: ${reason}`);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/agent/credentials/export-backup', (req: Request, res: Response) => {
  try {
    const backupBase64 = credentialVault.exportBackup();
    broadcastLog('VAULT', 'info', 'Encrypted credential vault backup exported.');
    res.json({
      success: true,
      backupPayload: backupBase64,
      timestamp: formatJakartaDate()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// SESSION MANAGEMENT ENDPOINTS
// =====================================================================

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

app.post('/api/agent/sessions/logout/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const success = bpjsSessionManager.invalidateSession(sessionId, 'Manual user logout');

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already expired'
      });
    }

    broadcastLog('SYSTEM', 'info', `Session ${sessionId} terminated.`);
    res.json({
      success: true,
      message: 'Session invalidated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/sessions/logout-portal/:portal', (req: Request, res: Response) => {
  try {
    const portal = req.params.portal as string;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    const loggedOut = bpjsSessionManager.logoutPortal(
      portal as 'EDABU' | 'SIPP',
      'Forced portal session flush'
    );

    broadcastLog('SYSTEM', 'info', `Logged out all ${loggedOut} active session(s) from ${portal}.`);

    res.json({
      success: true,
      loggedOutCount: loggedOut,
      message: `Logged out ${loggedOut} session(s) from ${portal}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/agent/sessions/config', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      config: bpjsSessionManager.getConfig()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/sessions/config', (req: Request, res: Response) => {
  try {
    const { sessionDurationMinutes, inactivityTimeoutMinutes, tokenRefreshThresholdMinutes, maxConcurrentSessions } = req.body;
    bpjsSessionManager.setConfig({
      sessionDurationMinutes: sessionDurationMinutes ? Number(sessionDurationMinutes) : undefined,
      inactivityTimeoutMinutes: inactivityTimeoutMinutes ? Number(inactivityTimeoutMinutes) : undefined,
      tokenRefreshThresholdMinutes: tokenRefreshThresholdMinutes ? Number(tokenRefreshThresholdMinutes) : undefined,
      maxConcurrentSessions: maxConcurrentSessions ? Number(maxConcurrentSessions) : undefined,
    });
    broadcastLog('SYSTEM', 'info', 'Session manager configuration updated.');
    res.json({
      success: true,
      config: bpjsSessionManager.getConfig()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// AUTONOMOUS SYNC ENDPOINTS
// =====================================================================

app.post('/api/agent/sync', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || (req.body?.period as string) || getCurrentPeriodJakarta();
    const force = req.query.force === 'true' || req.body?.force === true;
    const operator = req.body?.operator || 'AUTONOMOUS_SCHEDULER';

    broadcastLog('ENGINE', 'step', `▶ Initiating Autonomous Data Sync for period ${period} (force=${force})...`);

    // Step 1: Run validation
    const validation = bpjsSyncEngine.runValidation(period);
    bpjsSyncEngine.logValidationRun(validation, operator);

    broadcastLog('ENGINE', 'info', `Validation check complete: ${validation.summary.total} total records (${validation.summary.valid} valid, ${validation.summary.invalid} invalid).`);

    if (!force && validation.summary.invalid > 0) {
      broadcastLog('ENGINE', 'error', `Sync blocked: ${validation.summary.invalid} invalid records found. Rectify data or toggle force sync.`);
      return res.status(400).json({
        success: false,
        message: `Cannot sync: ${validation.summary.invalid} invalid records found. Fix data or use ?force=true`,
        invalidCount: validation.summary.invalid,
        validationSummary: validation.summary
      });
    }

    // Step 2: Check credentials
    if (!credentialVault.hasActiveCredential('EDABU')) {
      broadcastLog('VAULT', 'error', 'EDABU credentials not configured in Vault.');
      return res.status(403).json({
        success: false,
        message: 'EDABU credentials not configured. Configure credentials in Vault first.'
      });
    }

    if (!credentialVault.hasActiveCredential('SIPP')) {
      broadcastLog('VAULT', 'error', 'SIPP credentials not configured in Vault.');
      return res.status(403).json({
        success: false,
        message: 'SIPP credentials not configured. Configure credentials in Vault first.'
      });
    }

    // Step 3: Prepare delta subsets
    const newRecords = validation.records.filter(r => r.deltaStatus === 'NEW');
    const resignedRecords = validation.records.filter(r => ['RESIGNED', 'TERMINATED'].includes(r.deltaStatus));
    const changedRecords = validation.records.filter(r => r.deltaStatus === 'CHANGED');

    broadcastLog('ENGINE', 'info', `Delta queue breakdown: [NEW: ${newRecords.length}] [RESIGNED: ${resignedRecords.length}] [CHANGED: ${changedRecords.length}]`);

    // Step 4: Login to EDABU
    broadcastLog('EDABU', 'step', 'Navigating to BPJS Kesehatan EDABU portal...');
    const edabuLogin = await bpjsPortalAgent.loginToEdabu();

    if (!edabuLogin.success || !edabuLogin.sessionId) {
      broadcastLog('EDABU', 'error', `EDABU login failed: ${edabuLogin.message}`);
      return res.status(503).json({
        success: false,
        message: `EDABU login failed: ${edabuLogin.message}`,
        timestamp: edabuLogin.timestamp
      });
    }
    broadcastLog('EDABU', 'success', `EDABU authenticated successfully. Session ID: ${edabuLogin.sessionId}`);

    // Step 5: Login to SIPP
    broadcastLog('SIPP', 'step', 'Navigating to BPJS Ketenagakerjaan SIPP Online portal...');
    const sippLogin = await bpjsPortalAgent.loginToSipp();

    if (!sippLogin.success || !sippLogin.sessionId) {
      await bpjsPortalAgent.logoutEdabu(edabuLogin.sessionId);
      broadcastLog('SIPP', 'error', `SIPP login failed: ${sippLogin.message}`);
      return res.status(503).json({
        success: false,
        message: `SIPP login failed: ${sippLogin.message}`,
        timestamp: sippLogin.timestamp
      });
    }
    broadcastLog('SIPP', 'success', `SIPP authenticated successfully. Session ID: ${sippLogin.sessionId}`);

    // Step 6: Upload new employees
    const newEmployeesData = newRecords.map(r => r.currentData).filter(Boolean);
    broadcastLog('EDABU', 'step', `Registering ${newEmployeesData.length} new employees on EDABU...`);
    const edabuUpload = await bpjsPortalAgent.uploadEmployeeDataEdabu(edabuLogin.sessionId, newEmployeesData);

    broadcastLog('SIPP', 'step', `Enrolling ${newEmployeesData.length} new employees on SIPP Online...`);
    const sippUpload = await bpjsPortalAgent.uploadEmployeeDataSipp(sippLogin.sessionId, newEmployeesData);

    // Update newly registered employees status in store if successful
    if (edabuUpload.success && sippUpload.success) {
      for (const rec of newRecords) {
        employeeStore.update(rec.nik, {
          status: 'ACTIVE',
          nomorPeserta: rec.currentData.nomorPeserta || `000${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          kpj: rec.currentData.kpj || `1908${Math.floor(1000000 + Math.random() * 9000000)}`
        });
      }
    }

    // Step 7: Deactivate resigned/terminated
    const resignedNiks = resignedRecords.map(r => r.nik);
    broadcastLog('EDABU', 'step', `Deactivating ${resignedNiks.length} resigned employees on EDABU...`);
    const edabuDeactivate = await bpjsPortalAgent.deactivateEmployeeEdabu(edabuLogin.sessionId, resignedNiks);

    broadcastLog('SIPP', 'step', `Terminating ${resignedNiks.length} resigned employee memberships on SIPP...`);
    const sippDeactivate = await bpjsPortalAgent.deactivateEmployeeSipp(sippLogin.sessionId, resignedNiks);

    // Step 8: Safe logout and cleanup
    await bpjsPortalAgent.logoutEdabu(edabuLogin.sessionId);
    await bpjsPortalAgent.logoutSipp(sippLogin.sessionId);
    broadcastLog('SYSTEM', 'success', 'All portal sessions securely closed.');

    // Step 9: Final result
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
        sippDeactivate,
        changedRecordsCount: changedRecords.length
      }
    };

    broadcastLog('ENGINE', 'success', `✔ Sync cycle for ${period} completed! Registered: ${edabuUpload.uploadedCount}, Deactivated: ${edabuDeactivate.deactivatedCount}, Errors: ${syncResult.summary.failureCount}`);

    res.json(syncResult);
  } catch (error: any) {
    broadcastLog('ENGINE', 'error', `Sync cycle failed critically: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Sync failed: ${error.message}`,
      timestamp: formatJakartaDate()
    });
  }
});

// Login test
app.post('/api/agent/login-test/:portal', async (req: Request, res: Response) => {
  try {
    const portal = req.params.portal as string;

    if (!['EDABU', 'SIPP'].includes(portal)) {
      return res.status(400).json({ success: false, message: 'Invalid portal' });
    }

    broadcastLog(portal as any, 'step', `Testing autonomous handshake & login for ${portal}...`);

    let loginResult;
    if (portal === 'EDABU') {
      loginResult = await bpjsPortalAgent.loginToEdabu();
      if (loginResult.success && loginResult.sessionId) {
        broadcastLog('EDABU', 'success', `EDABU test login succeeded! Created session: ${loginResult.sessionId}`);
        await bpjsPortalAgent.logoutEdabu(loginResult.sessionId);
      } else {
        broadcastLog('EDABU', 'error', `EDABU test login failed: ${loginResult.message}`);
      }
    } else {
      loginResult = await bpjsPortalAgent.loginToSipp();
      if (loginResult.success && loginResult.sessionId) {
        broadcastLog('SIPP', 'success', `SIPP test login succeeded! Created session: ${loginResult.sessionId}`);
        await bpjsPortalAgent.logoutSipp(loginResult.sessionId);
      } else {
        broadcastLog('SIPP', 'error', `SIPP test login failed: ${loginResult.message}`);
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

app.get('/api/agent/session/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const status = bpjsPortalAgent.getSessionStatus(sessionId);
    res.json({
      success: true,
      session: status
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Diagnostics & Health
app.get('/api/agent/health', (req: Request, res: Response) => {
  try {
    const sessions = bpjsSessionManager.getSessionSummary();
    const edabuCreds = credentialVault.hasActiveCredential('EDABU');
    const sippCreds = credentialVault.hasActiveCredential('SIPP');

    res.json({
      success: true,
      health: {
        status: (edabuCreds && sippCreds) ? 'HEALTHY' : 'DEGRADED',
        activeSessions: sessions.totalActiveSessions,
        credentials: {
          edabu: edabuCreds,
          sipp: sippCreds
        },
        vaultMasterKeyConfigured: Boolean(process.env.CREDENTIAL_MASTER_KEY),
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

app.get('/api/agent/diagnostics', (req: Request, res: Response) => {
  try {
    const sessions = bpjsSessionManager.getSessionSummary();
    const edabuMeta = credentialVault.getCredentialMetadata('EDABU');
    const sippMeta = credentialVault.getCredentialMetadata('SIPP');
    const auditSummary = auditSnapshotStore.getStatusSummary();
    const employees = employeeStore.getAll();

    res.json({
      success: true,
      diagnostics: {
        timestamp: formatJakartaDate(),
        environment: {
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(process.uptime()),
          memoryUsage: process.memoryUsage(),
          timezone: process.env.TZ || 'Asia/Jakarta'
        },
        sessions,
        credentials: {
          edabu: edabuMeta,
          sipp: sippMeta
        },
        auditSummary,
        totalEmployees: employees.length,
        config: bpjsSessionManager.getConfig()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// AUDIT LOG ENDPOINTS
// =====================================================================

app.get('/api/agent/audit/logs', (req: Request, res: Response) => {
  try {
    const { action, status, source, nik, search, limit = '100', offset = '0' } = req.query;

    let logs = search
      ? auditSnapshotStore.searchAuditLogs(String(search))
      : auditSnapshotStore.getAuditLogs({
          action: action ? String(action) : undefined,
          status: status ? String(status) : undefined,
          source: source ? String(source) : undefined,
          nik: nik ? String(nik) : undefined,
          limit: Number(limit),
          offset: Number(offset)
        });

    res.json({
      success: true,
      total: logs.length,
      logs
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/agent/audit/summary', (req: Request, res: Response) => {
  try {
    const summary = auditSnapshotStore.getStatusSummary();
    res.json({
      success: true,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/agent/audit/export', (req: Request, res: Response) => {
  try {
    const exported = auditSnapshotStore.exportLogs();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="bpjs-audit-export.json"');
    res.send(exported);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/audit/clear', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    auditSnapshotStore.clearLogs(token);
    broadcastLog('SYSTEM', 'warn', 'Audit log records cleared with master confirmation.');
    res.json({ success: true, message: 'Audit logs cleared' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// =====================================================================
// EMPLOYEE MASTER DATA & VALIDATION ENDPOINTS
// =====================================================================

app.get('/api/agent/employees', (req: Request, res: Response) => {
  try {
    const list = employeeStore.getAll();
    res.json({
      success: true,
      total: list.length,
      employees: list
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/employees', (req: Request, res: Response) => {
  try {
    const record: EmployeeRecord = req.body;
    const result = employeeStore.add(record);
    if (!result.success) {
      return res.status(400).json(result);
    }
    broadcastLog('SYSTEM', 'info', `Employee added: ${record.name} (${record.nik})`);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/agent/employees/:nik', (req: Request, res: Response) => {
  try {
    const nik = req.params.nik as string;
    const updates = req.body;
    const result = employeeStore.update(nik, updates);
    if (!result.success) {
      return res.status(404).json(result);
    }
    broadcastLog('SYSTEM', 'info', `Employee updated: NIK ${nik}`);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/agent/employees/:nik', (req: Request, res: Response) => {
  try {
    const nik = req.params.nik as string;
    const deleted = employeeStore.delete(nik);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    broadcastLog('SYSTEM', 'warn', `Employee removed: NIK ${nik}`);
    res.json({ success: true, message: 'Employee deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/agent/employees/reset', (req: Request, res: Response) => {
  try {
    employeeStore.resetToDefault();
    broadcastLog('SYSTEM', 'info', 'Employee master data reset to default demo dataset.');
    res.json({ success: true, message: 'Employees reset to initial seed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/agent/validate', (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || getCurrentPeriodJakarta();
    const result = bpjsSyncEngine.runValidation(period);
    res.json({
      success: true,
      validation: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// FRONTEND SERVING (Vite in Dev / Static in Prod)
// =====================================================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BPJS Autonomous Agent Portal running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
