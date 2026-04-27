/**
 * @file  src/workers/feedback.worker.ts
 * @owner 基建
 * @module worker
 *
 * Background worker that polls for pending Receipt/Rating records
 * and submits ERC-8004 feedback transactions on-chain via setInterval.
 *
 * Type hints:
 *   - ../lib/prisma (prisma)
 *   - ../chain/erc8004 (sdk)
 *
 * Exports:
 *   - startFeedbackWorker()
 *   - stopFeedbackWorker()
 */
