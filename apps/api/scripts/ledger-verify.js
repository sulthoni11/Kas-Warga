/**
 * Verifikasi rantai satu komunitas.
 *   node apps/api/scripts/ledger-verify.js <communityId>
 * Exit 0 = VALID, 1 = INVALID.
 */
import { closePool } from '../src/db.js';
import { verifyChain } from '../src/services/ledger.js';

const communityId = Number(process.argv[2]);

if (!Number.isInteger(communityId) || communityId <= 0) {
  console.error('Pemakaian: node apps/api/scripts/ledger-verify.js <communityId>');
  process.exit(2);
}

let result;
let failed = false;

try {
  result = await verifyChain(communityId);
  failed = result.ok !== true;
} catch (error) {
  console.error('VERIFY ERROR', error);
  failed = true;
} finally {
  await closePool();
}

console.log(JSON.stringify(result ?? { ok: false, reason: 'ERROR' }));
process.exit(failed ? 1 : 0);
