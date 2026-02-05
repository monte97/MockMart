const pino = require('pino');

// Pino logger - trace context injected automatically by @opentelemetry/instrumentation-pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

module.exports = logger;
