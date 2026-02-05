const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { PinoInstrumentation } = require('@opentelemetry/instrumentation-pino');

const serviceName = process.env.OTEL_SERVICE_NAME || 'payment-service';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PinoInstrumentation(),
  ],
});

sdk.start();

console.log(`✅ OpenTelemetry initialized for ${serviceName}`);
console.log(`📡 Sending traces to ${otlpEndpoint}`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating', error))
    .finally(() => process.exit(0));
});
