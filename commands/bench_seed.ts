import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { ENGINE_KEYS, SEED, isEngineKey, type EngineKey } from '#config/constants'
import mongo from '#services/mongo_service'
import { seedMongo, seedSqlEngine } from '#services/seeder_service'

/**
 * Seeds one or all engines with synthetic records. SQL tables must already
 * exist — the Makefile runs `migration:run` per connection before this.
 *
 *   node ace bench:seed              # all engines, default row count
 *   node ace bench:seed postgres     # one engine
 *   node ace bench:seed all --rows=1000000
 */
export default class BenchSeed extends BaseCommand {
  static commandName = 'bench:seed'
  static description = 'Seed one or all database engines with synthetic benchmark data'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Engine to seed (mysql|mariadb|postgres|sqlite|mongo|all)', required: false })
  declare engine?: string

  @flags.number({ description: 'Number of rows to seed per engine', flagName: 'rows' })
  declare rows?: number

  @flags.number({ description: 'Insert batch size', flagName: 'batch' })
  declare batch?: number

  async run() {
    const rowCount = this.rows ?? SEED.defaultRowCount
    const batchSize = this.batch ?? SEED.batchSize
    const target = this.engine ?? 'all'

    const engines: EngineKey[] = target === 'all' ? [...ENGINE_KEYS] : [target as EngineKey]

    for (const engine of engines) {
      if (!isEngineKey(engine)) {
        this.logger.error(`Unknown engine: ${engine} (valid: ${ENGINE_KEYS.join(', ')})`)
        this.exitCode = 1
        continue
      }

      this.logger.info(`Seeding ${engine} with ${rowCount.toLocaleString()} rows…`)
      const startedAt = Date.now()
      let lastLogged = 0

      const onProgress = (inserted: number) => {
        if (inserted - lastLogged >= 25_000 || inserted === rowCount) {
          lastLogged = inserted
          this.logger.info(`  ${engine}: ${inserted.toLocaleString()} / ${rowCount.toLocaleString()}`)
        }
      }

      try {
        const inserted =
          engine === 'mongo'
            ? await seedMongo(rowCount, batchSize, onProgress)
            : await seedSqlEngine(engine, rowCount, batchSize, onProgress)

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        this.logger.success(`Seeded ${engine}: ${inserted.toLocaleString()} rows in ${seconds}s`)
      } catch (error) {
        // Don't let one engine's failure skip the rest (e.g. Mongo after SQLite).
        this.logger.error(`Failed to seed ${engine}: ${error?.message ?? error}`)
        this.exitCode = 1
      }
    }

    // Close the Mongo client so the command process can exit cleanly.
    await mongo.close()
  }
}
