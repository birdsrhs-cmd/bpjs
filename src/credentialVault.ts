import crypto from 'crypto';
import { auditSnapshotStore, formatJakartaDate } from './auditSnapshot.ts';

/**
 * CredentialVault: Secure storage & retrieval of BPJS portal credentials
 * 
 * Security Features:
 * - AES-256 encryption at rest
 * - PBKDF2 key derivation
 * - Credentials never logged in plaintext
 * - Encrypted backup capability
 * - Audit trail for all access
 */

interface CredentialRecord {
  portalName: 'EDABU' | 'SIPP';
  username: string;
  encryptedPassword: string;
  salt: string;
  iv: string;
  createdAt: string;
  lastAccessedAt?: string;
  lastRotatedAt?: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
}

interface DecryptedCredentials {
  portalName: 'EDABU' | 'SIPP';
  username: string;
  password: string;
  status: string;
}

class CredentialVault {
  private credentials: Map<string, CredentialRecord> = new Map();
  private encryptionKey: string;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;
  private readonly AUTH_TAG_LENGTH = 16;

  constructor() {
    // In production: load from Vault / AWS Secrets Manager
    // For now: derive from CREDENTIAL_MASTER_KEY env var
    this.encryptionKey = process.env.CREDENTIAL_MASTER_KEY || this.generateMasterKey();
    
    // Initialize from persisted storage (if available)
    this.loadFromStorage();
  }

  /**
   * Generate secure master key (fallback only)
   * PRODUCTION: Must use external vault!
   */
  private generateMasterKey(): string {
    const envKey = process.env.CREDENTIAL_MASTER_KEY;
    if (!envKey) {
      console.warn(
        '⚠️ WARNING: CREDENTIAL_MASTER_KEY not set. Using temporary key (NOT SAFE FOR PRODUCTION)'
      );
      return crypto.randomBytes(32).toString('hex');
    }
    return envKey;
  }

  /**
   * Store EDABU or SIPP credentials with encryption
   */
  public storeCredential(
    portalName: 'EDABU' | 'SIPP',
    username: string,
    password: string,
    createdBy: string = 'SYSTEM_ADMIN'
  ): { success: boolean; message: string } {
    try {
      // Validate input
      if (!username || !password) {
        return { success: false, message: 'Username dan password tidak boleh kosong' };
      }

      if (password.length < 8) {
        return { success: false, message: 'Password terlalu pendek (min 8 karakter)' };
      }

      // Generate encryption components
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Derive encryption key from master key + salt
      const derivedKey = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        100000, // iterations
        this.KEY_LENGTH,
        'sha256'
      );

      // Encrypt password
      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      // Store with metadata
      const record: CredentialRecord = {
        portalName,
        username,
        encryptedPassword: `${encrypted}.${authTag}`, // Append auth tag
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        createdAt: formatJakartaDate(),
        lastAccessedAt: undefined,
        lastRotatedAt: formatJakartaDate(),
        status: 'ACTIVE'
      };

      this.credentials.set(portalName, record);

      // Audit log
      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'Credential Vault',
        action: 'STORE_PORTAL_CREDENTIALS',
        old_value: '-',
        new_value: `Portal: ${portalName} | Username: ${username}`,
        status: 'SUCCESS',
        source: 'CREDENTIAL_VAULT',
        user_or_system: createdBy
      });

      return { success: true, message: `Kredensial ${portalName} berhasil disimpan` };
    } catch (error: any) {
      console.error(`[CredentialVault] Store error: ${error.message}`);
      
      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'Credential Vault',
        action: 'STORE_PORTAL_CREDENTIALS_FAILED',
        old_value: '-',
        new_value: `Portal: ${portalName}`,
        status: 'FAILED',
        source: 'CREDENTIAL_VAULT',
        error_message: error.message,
        user_or_system: 'SYSTEM'
      });

      return { success: false, message: `Gagal menyimpan kredensial: ${error.message}` };
    }
  }

  /**
   * Retrieve and decrypt credentials
   */
  public getCredential(
    portalName: 'EDABU' | 'SIPP',
    requestedBy: string = 'SYSTEM'
  ): DecryptedCredentials | null {
    try {
      const record = this.credentials.get(portalName);

      if (!record) {
        console.error(`[CredentialVault] Kredensial ${portalName} tidak ditemukan`);
        return null;
      }

      if (record.status !== 'ACTIVE') {
        console.error(`[CredentialVault] Kredensial ${portalName} tidak aktif (status: ${record.status})`);
        return null;
      }

      // Derive decryption key
      const salt = Buffer.from(record.salt, 'hex');
      const iv = Buffer.from(record.iv, 'hex');
      const derivedKey = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        100000,
        this.KEY_LENGTH,
        'sha256'
      );

      // Decrypt password
      const [encrypted, authTag] = record.encryptedPassword.split('.');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Update last accessed timestamp
      record.lastAccessedAt = formatJakartaDate();

      // Audit log (SUCCESS - no password in log!)
      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'Credential Vault',
        action: 'RETRIEVE_PORTAL_CREDENTIALS',
        old_value: '-',
        new_value: `Portal: ${portalName} | Username: ${record.username}`,
        status: 'SUCCESS',
        source: 'CREDENTIAL_VAULT',
        user_or_system: requestedBy
      });

      return {
        portalName,
        username: record.username,
        password: decrypted,
        status: record.status
      };
    } catch (error: any) {
      console.error(`[CredentialVault] Decrypt error: ${error.message}`);

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'Credential Vault',
        action: 'RETRIEVE_PORTAL_CREDENTIALS_FAILED',
        old_value: '-',
        new_value: `Portal: ${portalName}`,
        status: 'FAILED',
        source: 'CREDENTIAL_VAULT',
        error_message: error.message,
        user_or_system: 'SYSTEM'
      });

      return null;
    }
  }

  /**
   * Rotate credentials (security best practice)
   */
  public rotateCredential(
    portalName: 'EDABU' | 'SIPP',
    newPassword: string,
    rotatedBy: string = 'SYSTEM_ADMIN'
  ): { success: boolean; message: string } {
    try {
      const record = this.credentials.get(portalName);

      if (!record) {
        return { success: false, message: `Kredensial ${portalName} tidak ditemukan` };
      }

      // Generate new encryption
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      const derivedKey = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        100000,
        this.KEY_LENGTH,
        'sha256'
      );

      const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);
      let encrypted = cipher.update(newPassword, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      // Update record
      record.encryptedPassword = `${encrypted}.${authTag}`;
      record.salt = salt.toString('hex');
      record.iv = iv.toString('hex');
      record.lastRotatedAt = formatJakartaDate();

      auditSnapshotStore.addAuditLog({
        nik: 'SYSTEM',
        nama: 'Credential Vault',
        action: 'ROTATE_PORTAL_CREDENTIALS',
        old_value: 'Old password encrypted',
        new_value: 'New password encrypted',
        status: 'SUCCESS',
        source: 'CREDENTIAL_VAULT',
        user_or_system: rotatedBy
      });

      return { success: true, message: `Kredensial ${portalName} berhasil diperbarui` };
    } catch (error: any) {
      return { success: false, message: `Gagal merotasi kredensial: ${error.message}` };
    }
  }

  /**
   * Check if credentials exist and are active
   */
  public hasActiveCredential(portalName: 'EDABU' | 'SIPP'): boolean {
    const record = this.credentials.get(portalName);
    return record !== undefined && record.status === 'ACTIVE';
  }

  /**
   * Get credential metadata (without password!)
   */
  public getCredentialMetadata(portalName: 'EDABU' | 'SIPP'): any {
    const record = this.credentials.get(portalName);
    if (!record) return null;

    return {
      portalName: record.portalName,
      username: record.username,
      status: record.status,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
      lastRotatedAt: record.lastRotatedAt
    };
  }

  /**
   * Disable credential (security incident response)
   */
  public disableCredential(
    portalName: 'EDABU' | 'SIPP',
    reason: string = 'Security audit',
    disabledBy: string = 'SYSTEM_ADMIN'
  ): { success: boolean; message: string } {
    const record = this.credentials.get(portalName);
    if (!record) {
      return { success: false, message: `Kredensial ${portalName} tidak ditemukan` };
    }

    record.status = 'DISABLED';

    auditSnapshotStore.addAuditLog({
      nik: 'SYSTEM',
      nama: 'Credential Vault',
      action: 'DISABLE_PORTAL_CREDENTIALS',
      old_value: 'ACTIVE',
      new_value: 'DISABLED',
      status: 'SUCCESS',
      source: 'CREDENTIAL_VAULT',
      error_message: reason,
      user_or_system: disabledBy
    });

    return { success: true, message: `Kredensial ${portalName} berhasil dinonaktifkan` };
  }

  /**
   * Load credentials from persistent storage (if implemented)
   */
  private loadFromStorage(): void {
    // TODO: Implement persistence layer
    // Options:
    // 1. Redis (distributed)
    // 2. PostgreSQL with encrypted column
    // 3. File system with restricted permissions
    // 4. AWS Secrets Manager / Vault
    
    console.log('[CredentialVault] Initialized (in-memory storage)');
  }

  /**
   * Export credentials backup (encrypted)
   * For disaster recovery purposes only
   */
  public exportBackup(): string {
    const backup = {
      exportedAt: formatJakartaDate(),
      credentials: Array.from(this.credentials.values()).map(r => ({
        portalName: r.portalName,
        username: r.username,
        encryptedPassword: r.encryptedPassword,
        salt: r.salt,
        iv: r.iv,
        status: r.status
      }))
    };

    return Buffer.from(JSON.stringify(backup)).toString('base64');
  }
}

export const credentialVault = new CredentialVault();
