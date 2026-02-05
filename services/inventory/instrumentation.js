const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { LoggerProvider, SimpleLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const logsAPI = require('@opentelemetry/api-logs');

const serviceName = process.env.OTEL_SERVICE_NAME || 'inventory-service';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

// Shared resource for traces and logs
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
});

// Configure Log Exporter and Provider
const logExporter = new OTLPLogExporter({
  url: otlpEndpoint,
});

const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));

// Register LoggerProvider globally
logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();

console.log(`OpenTelemetry initialized for ${serviceName}`);
console.log(`Sending traces and logs to ${otlpEndpoint}`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => loggerProvider.shutdown())
    .then(() => console.log('Tracing and logging terminated'))
    .catch((error) => console.log('Error terminating', error))
    .finally(() => process.exit(0));
});
