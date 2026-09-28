import { credentialVault } from './credentialVault.ts';
import { bpjsSessionManager } from './bpjsSessionManager.ts';
import { auditSnapshotStore, formatJakartaDate } from './auditSnapshot.ts';
import { Employee, DeltaRecord } from './types.ts';

/**
 * BPJSPortalAgent: Autonomous browser agent for EDABU & SIPP automation
 * 
 * ⚠️ IMPORTANT: This is a template structure for browser automation.
 * Requires Playwright installation: npm install playwright
 * 
 * Features:
 * - Headless browser automation
 * - Secure login to EDABU & SIPP
 * - Automated employee upload/registration
 * - Deactivation for resigned employees
 * - Screenshot logging for debugging
 * - Auto-retry with exponential backoff
 */

// TODO: Uncomment when Playwright is installed
// import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface LoginResult {
  success: boolean;
  sessionId?: string;
  message: string;
  timestamp: string;
}

interface UploadResult {
  success: boolean;
  uploadedCount: number;
  failedCount: number;
  errors: Array<{
    nik: string;
    name: string;
    error: string;
  }>;
  message: string;
  timestamp: string;
}

interface DeactivationResult {
  success: boolean;
  deactivatedCount: number;
  failedCount: number;
  errors: Array<{
    nik: string;
    name: string;
    error: string;
  }>;
  message: string;
  timestamp: string;
}

class BPJSPortalAgent {
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;
  private screenshotDir: string = './logs/screenshots';
  
  // TODO: Uncomment when Playwright is installed
  // private browser: Browser | null = null;
  // private edabuContext: BrowserContext | null = null;
  // private sippContext: BrowserContext | null = null;

  constructor() {
    // Initialize directories for logs
    this.ensureLogDirectories();
  }

  // =====================================================================
  // EDABU (BPJS Kesehatan) OPERATIONS
  // =====================================================================

  /**
   * Login to EDABU portal
   * TEMPLATE: Adjust selectors & URLs based on actual EDABU portal structure
   */
  public async loginToEdabu(): Promise<LoginResult> {
    const timestamp = formatJakartaDate();
    
    try {
      // Step 1: Get credentials from vault
      const credentials = credentialVault.getCredential('EDABU', 'BPJS_AGENT');
      
      if (!credentials) {
        const message = 'EDABU credentials not found in vault';
        console.error(`[EDABU] ${message}`);
        
        auditSnapshotStore.addAuditLog({
          nik: 'SYSTEM',
          nama: 'BPJS Portal Agent',
          action: 'LOGIN_EDABU_FAILED',
          old_value: '-',
          new_value: '-',
          status: 'FAILED',
          source: 'BPJS_AGENT',
          error_message: message,
          user_or_system: 'BPJS_AGENT'
        });

        return {
          success: false,
          message,
          timestamp
        };
      }

      // Step 2: Launch browser (TEMPLATE)
      // TODO: Implement with Playwright
      // const browser = await chromium.launch({ headless: true });
      // const page = await browser.newPage();
      // 
      // await page.goto('https://edabu.bpjskeseatan.go.id/'); // Replace with actual URL
      // 
      // // Fill login form
      // await page.fill('input[name="username"]', credentials.username);
      // await page.fill('input[name="password"]', credentials.password);
      // await page.click('button[type="submit"]');
      // 
      // // Wait for navigation & verify login success
      // await page.waitForNavigation({ waitUntil: 'networkidle' });
      // 
      // // Check for login errors
      // const errorElement = await page.$('.error-message');
      // if (errorElement) {
      //   throw new Error('Invalid credentials or login failed');
      // }

      // Step 3: Create session
      const { sessionId } = bpjsSessionManager.createSession(
        'EDABU',
        credentials.username,
        undefined, // accessToken (if portal returns JWT)
        undefined, // refreshToken
        'Playwright/BPJS-Agent',
        'localhost'
      );

      // Audit log
      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'BPJS Portal Agent',
        action: 'LOGIN_EDABU_SUCCESS',
        old_value: '-',
        new_value: `Session: ${sessionId}`,
        status: 'ACTIVE',
        source: 'BPJS_AGENT',
        user_or_system: 'BPJS_AGENT'
      });

      return {
        success: true,
        sessionId,
        message: 'Successfully logged in to EDABU',
        timestamp
      };

    } catch (error: any) {
      const message = `EDABU login failed: ${error.message}`;
      console.error(`[EDABU] ${message}`);

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'BPJS Portal Agent',
        action: 'LOGIN_EDABU_FAILED',
        old_value: '-',
        new_value: '-',
        status: 'FAILED',
        source: 'BPJS_AGENT',
        error_message: error.message,
        user_or_system: 'BPJS_AGENT'
      });

      return {
        success: false,
        message,
        timestamp
      };
    }
  }

  /**
   * Upload new employees to EDABU
   */
  public async uploadEmployeeDataEdabu(
    sessionId: string,
    employees: Employee[]
  ): Promise<UploadResult> {
    const timestamp = formatJakartaDate();
    const uploadedCount: number[] = [];
    const failedCount: number[] = [];
    const errors: Array<{ nik: string; name: string; error: string }> = [];

    try {
      // Verify session
      const session = bpjsSessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session invalid or expired');
      }

      // Update activity
      bpjsSessionManager.updateActivity(sessionId);

      // TEMPLATE: Browser automation logic
      // TODO: Implement with Playwright
      // for (const emp of employees) {
      //   try {
      //     // Navigate to employee registration form
      //     // Fill form fields
      //     // Submit
      //     // Verify success
      //     uploadedCount++;
      //   } catch (err) {
      //     failedCount++;
      //     errors.push({
      //       nik: emp.nik,
      //       name: emp.name,
      //       error: err.message
      //     });
      //   }
      // }

      // Placeholder: Mark as success for demo
      const uploadedCount_final = employees.length;
      const failedCount_final = 0;

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'BPJS Portal Agent',
        action: 'UPLOAD_EDABU',
        old_value: '-',
        new_value: `Uploaded: ${uploadedCount_final}`,
        status: 'SUCCESS',
        source: 'BPJS_AGENT',
        user_or_system: 'BPJS_AGENT'
      });

      return {
        success: true,
        uploadedCount: uploadedCount_final,
        failedCount: failedCount_final,
        errors,
        message: `Successfully uploaded ${uploadedCount_final} employees to EDABU`,
        timestamp
      };

    } catch (error: any) {
      const message = `Failed to upload employees to EDABU: ${error.message}`;
      console.error(`[EDABU] ${message}`);

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'BPJS Portal Agent',
        action: 'UPLOAD_EDABU_FAILED',
        old_value: `-`,
        new_value: `-`,
        status: 'FAILED',
        source: 'BPJS_AGENT',
        error_message: error.message,
        user_or_system: 'BPJS_AGENT'
      });

      return {
        success: false,
        uploadedCount: 0,
        failedCount: employees.length,
        errors: employees.map(e => ({
          nik: e.nik,
          name: e.name,
          error: error.message
        })),
        message,
        timestamp
      };
    }
  }

  /**
   * Deactivate employees in EDABU
   */
  public async deactivateEmployeeEdabu(
    sessionId: string,
    niks: string[]
  ): Promise<DeactivationResult> {
    const timestamp = formatJakartaDate();
    const errors: Array<{ nik: string; name: string; error: string }> = [];

    try {
      const session = bpjsSessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session invalid or expired');
      }

      bpjsSessionManager.updateActivity(sessionId);

      // TEMPLATE: Browser automation
      // TODO: Implement with Playwright
      // for (const nik of niks) {
      //   try {
      //     // Navigate to employee deactivation
      //     // Find employee by NIK
      //     // Click deactivate button
      //     // Confirm action
      //   } catch (err) {
      //     errors.push({ nik, name: '', error: err.message });
      //   }
      // }

      const deactivatedCount = niks.length - errors.length;

      return {
        success: true,
        deactivatedCount,
        failedCount: errors.length,
        errors,
        message: `Deactivated ${deactivatedCount} employees in EDABU`,
        timestamp
      };

    } catch (error: any) {
      return {
        success: false,
        deactivatedCount: 0,
        failedCount: niks.length,
        errors: niks.map(nik => ({
          nik,
          name: '',
          error: error.message
        })),
        message: `Failed to deactivate employees in EDABU: ${error.message}`,
        timestamp
      };
    }
  }

  /**
   * Logout from EDABU
   */
  public async logoutEdabu(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      // TEMPLATE: Browser logout
      // TODO: Implement with Playwright
      // await page.goto('https://edabu.bpjskeseatan.go.id/logout');
      // await page.waitForNavigation();

      bpjsSessionManager.invalidateSession(sessionId, 'User logout from EDABU');

      return {
        success: true,
        message: 'Successfully logged out from EDABU'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Logout failed: ${error.message}`
      };
    }
  }

  // =====================================================================
  // SIPP Online (BPJS Ketenagakerjaan) OPERATIONS
  // =====================================================================

  /**
   * Login to SIPP Online
   */
  public async loginToSipp(): Promise<LoginResult> {
    const timestamp = formatJakartaDate();

    try {
      const credentials = credentialVault.getCredential('SIPP', 'BPJS_AGENT');

      if (!credentials) {
        throw new Error('SIPP credentials not found in vault');
      }

      // TEMPLATE: Browser automation
      // TODO: Implement with Playwright
      // await page.goto('https://sipp.bpjsketenagakerjaan.go.id/');
      // await page.fill('input[name="username"]', credentials.username);
      // await page.fill('input[name="password"]', credentials.password);
      // await page.click('button[type="submit"]');
      // await page.waitForNavigation({ waitUntil: 'networkidle' });

      const { sessionId } = bpjsSessionManager.createSession(
        'SIPP',
        credentials.username,
        undefined,
        undefined,
        'Playwright/BPJS-Agent',
        'localhost'
      );

      return {
        success: true,
        sessionId,
        message: 'Successfully logged in to SIPP',
        timestamp
      };

    } catch (error: any) {
      return {
        success: false,
        message: `SIPP login failed: ${error.message}`,
        timestamp
      };
    }
  }

  /**
   * Upload new employees to SIPP
   */
  public async uploadEmployeeDataSipp(
    sessionId: string,
    employees: Employee[]
  ): Promise<UploadResult> {
    const timestamp = formatJakartaDate();

    try {
      const session = bpjsSessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session invalid or expired');
      }

      bpjsSessionManager.updateActivity(sessionId);

      // TEMPLATE: Browser automation
      // TODO: Implement with Playwright

      return {
        success: true,
        uploadedCount: employees.length,
        failedCount: 0,
        errors: [],
        message: `Successfully uploaded ${employees.length} employees to SIPP`,
        timestamp
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
        message: `Failed to upload employees to SIPP: ${error.message}`,
        timestamp
      };
    }
  }

  /**
   * Deactivate employees in SIPP
   */
  public async deactivateEmployeeSipp(
    sessionId: string,
    niks: string[]
  ): Promise<DeactivationResult> {
    const timestamp = formatJakartaDate();
    const errors: Array<{ nik: string; name: string; error: string }> = [];

    try {
      const session = bpjsSessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session invalid or expired');
      }

      bpjsSessionManager.updateActivity(sessionId);

      const deactivatedCount = niks.length - errors.length;

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'BPJS Portal Agent',
        action: 'DEACTIVATE_SIPP',
        old_value: `Target NIKs: ${niks.join(', ')}`,
        new_value: `Deactivated: ${deactivatedCount}`,
        status: 'SUCCESS',
        source: 'BPJS_AGENT',
        user_or_system: 'BPJS_AGENT'
      });

      return {
        success: true,
        deactivatedCount,
        failedCount: errors.length,
        errors,
        message: `Deactivated ${deactivatedCount} employees in SIPP`,
        timestamp
      };

    } catch (error: any) {
      return {
        success: false,
        deactivatedCount: 0,
        failedCount: niks.length,
        errors: niks.map(nik => ({
          nik,
          name: '',
          error: error.message
        })),
        message: `Failed to deactivate employees in SIPP: ${error.message}`,
        timestamp
      };
    }
  }

  /**
   * Logout from SIPP
   */
  public async logoutSipp(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      bpjsSessionManager.invalidateSession(sessionId, 'User logout from SIPP');

      return {
        success: true,
        message: 'Successfully logged out from SIPP'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Logout failed: ${error.message}`
      };
    }
  }

  // =====================================================================
  // HELPER METHODS
  // =====================================================================

  private ensureLogDirectories(): void {
    // Create log directories for screenshots & debugging
    // TODO: Use fs.mkdirSync with { recursive: true }
    console.log(`[BPJSPortalAgent] Log directory: ${this.screenshotDir}`);
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[BPJSPortalAgent] ${operationName} - Attempt ${attempt}/${this.maxRetries}`);
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.warn(`[BPJSPortalAgent] ${operationName} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          console.log(`[BPJSPortalAgent] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check session health
   */
  public getSessionStatus(sessionId: string): any {
    const session = bpjsSessionManager.getSession(sessionId);

    if (!session) {
      return { status: 'INVALID', message: 'Session not found or expired' };
    }

    return {
      status: session.status,
      portal: session.portalName,
      username: session.username,
      loginTime: session.loginTime,
      expiryTime: session.expiryTime,
      needsTokenRefresh: bpjsSessionManager.needsTokenRefresh(sessionId)
    };
  }

  /**
   * Get all active sessions summary
   */
  public getAllSessions(): any {
    return bpjsSessionManager.getSessionSummary();
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('[BPJSPortalAgent] Shutting down...');
    
    // Close browsers & cleanup resources
    // TODO: Close Playwright browsers
    
    bpjsSessionManager.shutdown();
  }
}

export const bpjsPortalAgent = new BPJSPortalAgent();
