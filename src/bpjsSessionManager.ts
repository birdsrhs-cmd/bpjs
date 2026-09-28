import { auditSnapshotStore, formatJakartaDate } from './auditSnapshot.ts';

/**
 * BPJSSessionManager: Handle login sessions & tokens for EDABU & SIPP
 * 
 * Features:
 * - Track active sessions per portal
 * - Auto-refresh tokens before expiry
 * - Graceful timeout & cleanup
 * - Concurrent request handling
 * - Session recovery after interruption
 */

interface Session {
  sessionId: string;
  portalName: 'EDABU' | 'SIPP';
  username: string;
  loginTime: string;
  expiryTime: string;
  lastActivityTime: string;
  status: 'ACTIVE' | 'EXPIRED' | 'INVALID';
  refreshToken?: string;
  accessToken?: string;
  cookies?: string[]; // Session cookies from portal
  userAgent?: string;
  ipAddress?: string;
}

interface SessionConfig {
  sessionDurationMinutes: number;
  inactivityTimeoutMinutes: number;
  tokenRefreshThresholdMinutes: number;
  maxConcurrentSessions: number;
}

class BPJSSessionManager {
  private sessions: Map<string, Session> = new Map();
  private portalSessions: Map<'EDABU' | 'SIPP', string[]> = new Map();
  
  private config: SessionConfig = {
    sessionDurationMinutes: 60,      // 1 hour max session
    inactivityTimeoutMinutes: 30,    // 30 min inactivity logout
    tokenRefreshThresholdMinutes: 10, // Refresh 10 min before expiry
    maxConcurrentSessions: 3         // Max 3 concurrent sessions per portal
  };

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.portalSessions.set('EDABU', []);
    this.portalSessions.set('SIPP', []);
    this.startCleanupWorker();
  }

  /**
   * Create new login session
   */
  public createSession(
    portalName: 'EDABU' | 'SIPP',
    username: string,
    accessToken?: string,
    refreshToken?: string,
    userAgent?: string,
    ipAddress?: string
  ): { sessionId: string; session: Session } {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiryTime = new Date(now.getTime() + this.config.sessionDurationMinutes * 60000);

    const session: Session = {
      sessionId,
      portalName,
      username,
      loginTime: formatJakartaDate(),
      expiryTime: this.formatTime(expiryTime),
      lastActivityTime: formatJakartaDate(),
      status: 'ACTIVE',
      accessToken,
      refreshToken,
      userAgent,
      ipAddress
    };

    this.sessions.set(sessionId, session);
    
    // Track per portal
    const portalSessionIds = this.portalSessions.get(portalName) || [];
    portalSessionIds.push(sessionId);
    
    // Enforce max concurrent sessions
    if (portalSessionIds.length > this.config.maxConcurrentSessions) {
      const oldestId = portalSessionIds.shift();
      if (oldestId) {
        this.invalidateSession(oldestId);
      }
    }

    this.portalSessions.set(portalName, portalSessionIds);

    // Audit log
    auditSnapshotStore.addAuditLog({
      nik: 'SYSTEM',
      nama: 'Session Manager',
      action: 'LOGIN_SUCCESS',
      old_value: '-',
      new_value: `Portal: ${portalName} | Username: ${username} | SessionID: ${sessionId}`,
      status: 'ACTIVE',
      source: 'SESSION_MANAGER',
      user_or_system: 'BPJS_AGENT'
    });

    return { sessionId, session };
  }

  /**
   * Get active session
   */
  public getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (this.isSessionExpired(session)) {
      this.invalidateSession(sessionId);
      return null;
    }

    // Check inactivity timeout
    if (this.isInactive(session)) {
      this.invalidateSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get current active session for portal (if exists)
   */
  public getPortalSession(portalName: 'EDABU' | 'SIPP'): Session | null {
    const sessionIds = this.portalSessions.get(portalName) || [];

    for (const sessionId of sessionIds) {
      const session = this.getSession(sessionId);
      if (session) {
        return session;
      }
    }

    return null;
  }

  /**
   * Update activity timestamp (keep session alive)
   */
  public updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session || !this.getSession(sessionId)) {
      return false; // Session invalid/expired
    }

    session.lastActivityTime = formatJakartaDate();
    return true;
  }

  /**
   * Refresh token before expiry
   */
  public refreshToken(
    sessionId: string,
    newAccessToken: string,
    newRefreshToken?: string
  ): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.accessToken = newAccessToken;
    if (newRefreshToken) {
      session.refreshToken = newRefreshToken;
    }

    // Extend expiry
    const expiryTime = new Date(Date.now() + this.config.sessionDurationMinutes * 60000);
    session.expiryTime = this.formatTime(expiryTime);

    auditSnapshotStore.addAuditLog({
      nik: 'SYSTEM',
      nama: 'Session Manager',
      action: 'TOKEN_REFRESH',
      old_value: 'Old token',
      new_value: 'New token issued',
      status: 'SUCCESS',
      source: 'SESSION_MANAGER',
      user_or_system: 'BPJS_AGENT'
    });

    return true;
  }

  /**
   * Check if token needs refresh (approaching expiry)
   */
  public needsTokenRefresh(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    const expiryTime = new Date(session.expiryTime);
    const now = new Date();
    const minutesUntilExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60);

    return minutesUntilExpiry <= this.config.tokenRefreshThresholdMinutes;
  }

  /**
   * Logout / Invalidate session
   */
  public invalidateSession(sessionId: string, reason: string = 'User logout'): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    const portalName = session.portalName;
    const sessionIds = this.portalSessions.get(portalName) || [];
    const index = sessionIds.indexOf(sessionId);

    if (index > -1) {
      sessionIds.splice(index, 1);
      this.portalSessions.set(portalName, sessionIds);
    }

    session.status = 'INVALID';
    this.sessions.delete(sessionId);

    auditSnapshotStore.addAuditLog({
      nik: 'SYSTEM',
      nama: 'Session Manager',
      action: 'LOGOUT',
      old_value: 'ACTIVE',
      new_value: 'INVALID',
      status: 'SUCCESS',
      source: 'SESSION_MANAGER',
      error_message: reason,
      user_or_system: 'BPJS_AGENT'
    });

    return true;
  }

  /**
   * Check all sessions & cleanup expired ones
   */
  public cleanupExpiredSessions(): number {
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session) || this.isInactive(session)) {
        this.invalidateSession(sessionId, 'Automatic cleanup - expiration/inactivity');
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SessionManager] Cleaned up ${cleanedCount} expired session(s)`);
    }

    return cleanedCount;
  }

  /**
   * Get session summary
   */
  public getSessionSummary(): {
    totalActiveSessions: number;
    edabuSessions: number;
    sippSessions: number;
    sessions: any[];
  } {
    const activeSessions: Session[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.getSession(sessionId)) {
        activeSessions.push(session);
      }
    }

    const edabuCount = activeSessions.filter(s => s.portalName === 'EDABU').length;
    const sippCount = activeSessions.filter(s => s.portalName === 'SIPP').length;

    return {
      totalActiveSessions: activeSessions.length,
      edabuSessions: edabuCount,
      sippSessions: sippCount,
      sessions: activeSessions.map(s => ({
        sessionId: s.sessionId,
        portalName: s.portalName,
        username: s.username,
        loginTime: s.loginTime,
        expiryTime: s.expiryTime,
        status: s.status,
        timeUntilExpiry: this.getTimeUntilExpiry(s)
      }))
    };
  }

  /**
   * Force logout all sessions for a portal
   */
  public logoutPortal(portalName: 'EDABU' | 'SIPP', reason: string = 'Admin action'): number {
    const sessionIds = this.portalSessions.get(portalName) || [];
    let loggedOutCount = 0;

    for (const sessionId of sessionIds) {
      if (this.invalidateSession(sessionId, reason)) {
        loggedOutCount++;
      }
    }

    return loggedOutCount;
  }

  /**
   * Private helper methods
   */

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}`;
  }

  private isSessionExpired(session: Session): boolean {
    const expiryTime = new Date(session.expiryTime);
    return expiryTime < new Date();
  }

  private isInactive(session: Session): boolean {
    const lastActivity = new Date(session.lastActivityTime);
    const now = new Date();
    const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return minutesSinceActivity >= this.config.inactivityTimeoutMinutes;
  }

  private formatTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getDate().toString().padStart(2, '0')}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private getTimeUntilExpiry(session: Session): string {
    const expiryTime = new Date(session.expiryTime);
    const now = new Date();
    const diffMs = expiryTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expired';
    }

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  private startCleanupWorker(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

    console.log('[SessionManager] Cleanup worker started (runs every 5 minutes)');
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Logout all sessions
    for (const portalName of ['EDABU', 'SIPP'] as const) {
      this.logoutPortal(portalName, 'Server shutdown');
    }

    console.log('[SessionManager] Shutdown complete');
  }

  /**
   * Configure session parameters
   */
  public setConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[SessionManager] Config updated:', this.config);
  }

  /**
   * Get current config
   */
  public getConfig(): SessionConfig {
    return { ...this.config };
  }
}

export const bpjsSessionManager = new BPJSSessionManager();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  bpjsSessionManager.shutdown();
});

process.on('SIGINT', () => {
  bpjsSessionManager.shutdown();
});
