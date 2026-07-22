/**
 * OpenTelemetry initialization file.
 *
 * IMPORTANT: This file is imported FIRST in bin/server.ts so that
 * auto-instrumentation can patch libraries before the app loads them. It works
 * in both the built stack (`npm start`) and the HMR dev loop (`npm run dev`) —
 * `rewriteRelativeImportExtensions` in tsconfig lets the instrumentation
 * resolve the app's TypeScript files in dev.
 */
import { init } from '@adonisjs/otel/init'

await init(import.meta.dirname)
