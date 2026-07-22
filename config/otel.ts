import { defineConfig } from '@adonisjs/otel'

import { OTEL } from '#config/constants'

/**
 * OpenTelemetry configuration.
 *
 * All traces, metrics, and logs are shipped over OTLP/HTTP to the collector
 * (`otel-collector`), which fans them out to Tempo (traces), Prometheus
 * (metrics), and Loki (logs). Endpoint comes from the global constants module.
 */
export default defineConfig({
  serviceName: OTEL.serviceName,
  serviceVersion: '1.0.0',
  environment: 'benchmark',

  /**
   * No @adonisjs/auth in this project, so disable automatic user-context
   * extraction (it would look for `ctx.auth.user`).
   */
  userContext: false,

  /**
   * Fan telemetry out to the LGTM collector. Signal paths (/v1/traces,
   * /v1/metrics, /v1/logs) are appended automatically.
   */
  destinations: {
    lgtm: {
      type: 'otlp',
      enabled: true,
      signals: 'all',
      endpoint: OTEL.otlpEndpoint,
      /** Export metrics frequently so the dashboards feel live. */
      metricExportIntervalMillis: 5000,
    },
  },

  /**
   * Auto-instrumentations are enabled by default. We only trim the noisy
   * filesystem instrumentation; pg / mysql2 / mongodb / http / pino stay on
   * and produce the per-query spans we care about.
   */
  instrumentations: {
    '@opentelemetry/instrumentation-fs': { enabled: false },
  },
})
