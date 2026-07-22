import { BaseCommand, flags } from '@adonisjs/core/ace'

import { ENGINE_KEYS, LOADGEN } from '#config/constants'
import { QUERY_TYPES } from '#services/query_catalog'

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Continuously fires benchmark requests at the API so the Grafana dashboards
 * show live, comparable time-series across every engine × variant. Runs until
 * the process is stopped (SIGTERM), or until `--requests` are sent.
 *
 *   node ace bench:load
 *   node ace bench:load --concurrency=10 --interval=100 --url=http://app:3333
 */
export default class BenchLoad extends BaseCommand {
  static commandName = 'bench:load'
  static description = 'Continuously generate benchmark load across all engines'

  @flags.string({ description: 'Base URL of the benchmark API', flagName: 'url' })
  declare url?: string

  @flags.number({ description: 'Number of concurrent workers', flagName: 'concurrency' })
  declare concurrency?: number

  @flags.number({ description: 'Delay between requests per worker (ms)', flagName: 'interval' })
  declare interval?: number

  @flags.number({ description: 'Stop after N total requests (0 = run forever)', flagName: 'requests' })
  declare requests?: number

  async run() {
    const baseUrl = (this.url ?? LOADGEN.baseUrl).replace(/\/$/, '')
    const concurrency = this.concurrency ?? LOADGEN.concurrency
    const interval = this.interval ?? LOADGEN.intervalMs
    const maxRequests = this.requests ?? 0

    this.logger.info(
      `Load generator → ${baseUrl} | concurrency=${concurrency} interval=${interval}ms ` +
        `${maxRequests ? `requests=${maxRequests}` : '(runs until stopped)'}`
    )

    let sent = 0
    let ok = 0
    let failed = 0
    let running = true
    const stop = () => {
      running = false
    }
    process.on('SIGTERM', stop)
    process.on('SIGINT', stop)

    // Periodic throughput summary.
    const reporter = setInterval(() => {
      this.logger.info(`sent=${sent} ok=${ok} failed=${failed}`)
    }, 5000)

    const worker = async () => {
      while (running && (maxRequests === 0 || sent < maxRequests)) {
        const engine = pick(ENGINE_KEYS)
        const queryType = pick(QUERY_TYPES)
        const indexed = Math.random() < 0.5
        const scoped = Math.random() < 0.5
        const target = `${baseUrl}/bench/${engine}/${queryType}?indexed=${indexed}&scoped=${scoped}`

        sent++
        try {
          const response = await fetch(target)
          if (response.ok) ok++
          else failed++
          // Drain the body so the connection can be reused.
          await response.text()
        } catch {
          failed++
        }

        if (interval > 0) await sleep(interval)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    clearInterval(reporter)
    this.logger.success(`Load generator stopped. sent=${sent} ok=${ok} failed=${failed}`)
  }
}
