import type { HttpContext } from '@adonisjs/core/http'

import { ENGINES } from '#config/constants'
import { engineRowCount } from '#services/benchmark_service'
import { QUERY_CATALOG } from '#services/query_catalog'

export default class EnginesController {
  /**
   * GET /engines — list engines with health + seeded row counts, plus the
   * available query variants.
   */
  async index({}: HttpContext) {
    const engines = await Promise.all(
      ENGINES.map(async (engine) => {
        try {
          const rows = await engineRowCount(engine.key)
          return { ...engine, status: 'up' as const, rows }
        } catch (error) {
          return { ...engine, status: 'down' as const, rows: 0, error: String(error?.message ?? error) }
        }
      })
    )

    return { engines, queryTypes: QUERY_CATALOG }
  }
}
