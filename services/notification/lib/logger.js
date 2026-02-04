const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const { trace, context } = require('@opentelemetry/api');

/**
 * OpenTelemetry Logger - sends logs via OTLP with automatic trace correlation
 */
class OTelLogger {
  constructor(name = 'notification-service') {
    this.otelLogger = logs.getLogger(name);
  }

  _emit(severityNumber, severityText, message, attributes = {}) {
    const currentContext = context.active();
    const activeSpan = trace.getSpan(currentContext);
    const spanContext = activeSpan?.spanContext();

    // Build structured log body with trace context for Loki correlation
    const logBody = {
      msg: message,
      ...attributes,
    };

    if (spanContext) {
      logBody.traceId = spanContext.traceId;
      logBody.spanId = spanContext.spanId;
    }

    // Emit log record with JSON body
    this.otelLogger.emit({
      severityNumber,
      severityText,
      body: JSON.stringify(logBody),
      attributes: { ...attributes },
      context: currentContext,
    });

    // Also log to console for local debugging
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: severityText,
      ...logBody,
    }));
  }

  info(attributes, message) {
    if (typeof attributes === 'string') {
      message = attributes;
      attributes = {};
    }
    this._emit(SeverityNumber.INFO, 'INFO', message, attributes);
  }

  warn(attributes, message) {
    if (typeof attributes === 'string') {
      message = attributes;
      attributes = {};
    }
    this._emit(SeverityNumber.WARN, 'WARN', message, attributes);
  }

  error(attributes, message) {
    if (typeof attributes === 'string') {
      message = attributes;
      attributes = {};
    }
    this._emit(SeverityNumber.ERROR, 'ERROR', message, attributes);
  }

  debug(attributes, message) {
    if (typeof attributes === 'string') {
      message = attributes;
      attributes = {};
    }
    this._emit(SeverityNumber.DEBUG, 'DEBUG', message, attributes);
  }
}

module.exports = new OTelLogger();
