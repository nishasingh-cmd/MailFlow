/**
 * MailFlow Worker — Phase 1: Project Foundation placeholder.
 *
 * BullMQ queue consumers for email delivery will be wired in a later phase
 * per the Technical Architecture Document (Section 10: Queue Processing).
 *
 * For now this process simply confirms the worker environment is set up correctly
 * and exits cleanly.
 */
import 'dotenv/config';

console.log('[worker] MailFlow Worker — Setup Complete');
console.log('[worker] BullMQ email queue consumers will be registered in a future phase.');
console.log('[worker] Environment:', process.env.NODE_ENV ?? 'development');
