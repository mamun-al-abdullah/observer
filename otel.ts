/**
 * OpenTelemetry initialization file.
 *
 * IMPORTANT: This file is imported FIRST in bin/server.ts so that
 * auto-instrumentation can patch libraries before the app loads them.
 *
 * It is only activated in production. In development the app runs raw
 * TypeScript, and OTel's ESM instrumentation (import-in-the-middle) registers
 * a loader hook that cannot resolve ".ts" imports. Loading `@adonisjs/otel`
 * lazily behind this guard keeps that hook out of the dev/HMR loop entirely.
 */
if (process.env.NODE_ENV === 'production') {
  const { init } = await import('@adonisjs/otel/init')
  await init(import.meta.dirname)
}
