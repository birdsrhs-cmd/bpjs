import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { credentialVault } from './src/credentialVault.ts';
import { bpjsSessionManager } from './src/bpjsSessionManager.ts';
import { bpjsPortalAgent } from './src/bpjsPortalAgent.ts';
import { auditSnapshotStore } from './src/auditSnapshot.ts';

async function main() {
  console.log('=== BPJS Autonomous Agent Test ===\n');

  // Generate master key if not set
  if (!process.env.CREDENTIAL_MASTER_KEY) {
    const crypto = await import('crypto');
    process.env.CREDENTIAL_MASTER_KEY = crypto.randomBytes(32).toString('hex');
    console.log('⚠️  Generated temporary master key (NOT for production)');
    console.log(`   ${process.env.CREDENTIAL_MASTER_KEY}\n`);
  }

  // Store credentials from env
  console.log('--- Step 1: Store Credentials ---');
  
  if (process.env.EDABU_USERNAME && process.env.EDABU_PASSWORD) {
    const edabuResult = credentialVault.storeCredential(
      'EDABU',
      process.env.EDABU_USERNAME,
      process.env.EDABU_PASSWORD,
      'TEST_ADMIN'
    );
    console.log(`EDABU: ${edabuResult.success ? 'OK' : 'FAIL'} - ${edabuResult.message}`);
  } else {
    console.log('⚠️  EDABU credentials not set in .env.local');
  }

  if (process.env.SIPP_USERNAME && process.env.SIPP_PASSWORD) {
    const sippResult = credentialVault.storeCredential(
      'SIPP',
      process.env.SIPP_USERNAME,
      process.env.SIPP_PASSWORD,
      'TEST_ADMIN'
    );
    console.log(`SIPP: ${sippResult.success ? 'OK' : 'FAIL'} - ${sippResult.message}`);
  } else {
    console.log('⚠️  SIPP credentials not set in .env.local');
  }

  console.log('\n--- Step 2: Try Login to EDABU ---');
  
  try {
    const loginResult = await bpjsPortalAgent.loginToEdabu();
    console.log(`Login EDABU: ${loginResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Message: ${loginResult.message}`);
    if (loginResult.sessionId) {
      console.log(`Session ID: ${loginResult.sessionId}`);
    }
  } catch (error) {
    console.log(`Login EDABU ERROR: ${error}`);
  }

  console.log('\n--- Step 3: Check Sessions ---');
  const sessions = bpjsSessionManager.getSessionSummary();
  console.log(`Active sessions: ${sessions.totalActiveSessions}`);
  console.log(`EDABU sessions: ${sessions.edabuSessions}`);
  console.log(`SIPP sessions: ${sessions.sippSessions}`);

  console.log('\n--- Step 4: Audit Log Summary ---');
  const summary = auditSnapshotStore.getStatusSummary();
  console.log('Audit status:', JSON.stringify(summary, null, 2));

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
