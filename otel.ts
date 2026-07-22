/**
 * OpenTelemetry initialization file.
 *
 * IMPORTANT: This file is imported FIRST in bin/server.ts (and bin/console.ts)
 * so that auto-instrumentation can patch the HTTP / pg / mysql2 / mongodb /
 * pino libraries before they are required by the application.
 */
import { init } from '@adonisjs/otel/init'

await init(import.meta.dirname)
