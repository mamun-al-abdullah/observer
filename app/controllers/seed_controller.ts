import type { HttpContext } from '@adonisjs/core/http'

import { ENGINE_KEYS, SEED, isEngineKey, type EngineKey } from '#config/constants'
import { seedMongo, seedSqlEngine } from '#services/seeder_service'

/**
 * POST /seed/:engine?rows= — convenience endpoint for reseeding one engine (or
 * `all`). SQL tables must already exist (run `make seed`, which also migrates).
 * For large volumes prefer the `bench:seed` Ace command to avoid HTTP timeouts.
 */
export default class SeedController {
  async store({ params, request, response }: HttpContext) {
    const target: string = params.engine
    const rows = Number(request.input('rows', SEED.defaultRowCount))
    if (!Number.isFinite(rows) || rows <= 0) {
      return response.badRequest({ error: `Invalid rows: ${request.input('rows')}` })
    }

    const engines: EngineKey[] =
      target === 'all' ? [...ENGINE_KEYS] : isEngineKey(target) ? [target] : []

    if (engines.length === 0) {
      return response.badRequest({ error: `Unknown engine: ${target}`, engines: ENGINE_KEYS })
    }

    const seeded = []
    for (const engine of engines) {
      const inserted =
        engine === 'mongo'
          ? await seedMongo(rows, SEED.batchSize)
          : await seedSqlEngine(engine, rows, SEED.batchSize)
      seeded.push({ engine, inserted })
    }

    return { rows, seeded }
  }
}
