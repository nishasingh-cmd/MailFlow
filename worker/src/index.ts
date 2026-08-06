import 'dotenv/config';

console.log('[worker] MailFlow Worker — Setup Complete');
console.log('[worker] BullMQ email queue consumers will be registered in a future phase.');
console.log('[worker] Environment:', process.env.NODE_ENV ?? 'development');
