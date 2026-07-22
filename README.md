# Observer — Multi-Engine DB Query Benchmarking Lab

Run the **same query workloads** against **MySQL 8, MariaDB, PostgreSQL 17, SQLite, and MongoDB**
and compare their latency **visually in Grafana** — with vs. without an index, with vs. without
scoping, and for counts. Built on **AdonisJS 7** with **OpenTelemetry → Prometheus / Loki / Tempo**.
Everything runs in Docker.

## Stack

| Layer | Tech |
|---|---|
| API + benchmark runners | AdonisJS 7 (Node 24), Lucid (SQL), native `mongodb` driver |
| Telemetry | `@adonisjs/otel` (OTLP) → OpenTelemetry Collector |
| Metrics | Prometheus |
| Logs | Loki |
| Traces | Tempo |
| Dashboards | Grafana (auto-provisioned) |

## Quick start

```bash
make up      # build + start everything (app, 5 engines, LGTM stack)
make seed    # migrate all SQL engines + seed every engine (100k rows by default)
make load    # start the load generator so dashboards fill with live data
```

Then open:

- **Grafana** → http://localhost:3001 → dashboard **“Query Latency Comparison”** (anonymous admin, no login)
- **API** → http://localhost:3333

Scale the dataset up (into the millions):

```bash
make seed ROWS=1000000
```

Stop / wipe:

```bash
make down    # stop, keep data
make clean   # stop and delete all volumes
```

Run `make help` for all targets.

### npm scripts (no `make` required)

The same workflow is available as npm scripts, so it works anywhere `docker compose` is installed:

```bash
npm run setup      # one command: up + seed + load
npm run up         # build & start the full stack
npm run seed       # migrate all SQL engines + seed every engine
npm run load       # start the load generator
npm run load:stop  # stop the load generator
npm run logs       # tail the app logs
npm run ps         # container status
npm run stop       # stop containers (keep data)
npm run down       # stop & remove containers (keep data)
npm run clean      # stop & delete all data volumes
npm run grafana    # open Grafana in the browser (macOS)
```

`npm run setup` is the fastest way to go from zero to live dashboards.

## API

| Method & path | Description |
|---|---|
| `GET /engines` | Engine health + seeded row counts + available query variants |
| `GET /bench/:engine/:queryType?indexed=&scoped=&limit=` | Run one variant against one engine, return latency |
| `GET /bench/compare/:queryType?indexed=&scoped=` | Run one variant across **all** engines |
| `POST /seed/:engine?rows=` | Reseed one engine (or `all`) — prefer `make seed` for big loads |

`:engine` ∈ `mysql | mariadb | postgres | sqlite | mongo`
`:queryType` ∈ `point-lookup | range-scan | count | scoping | join | sort-paginate`

Examples:

```bash
curl "http://localhost:3333/bench/postgres/point-lookup?indexed=false"   # full scan
curl "http://localhost:3333/bench/postgres/point-lookup?indexed=true"    # index seek
curl "http://localhost:3333/bench/compare/count"                          # count timing, all engines
```

## Query variants

- **point-lookup** — equality match: `indexed=true` uses the indexed column, `false` forces a full scan.
- **range-scan** — range filter, indexed vs unindexed column.
- **count** — whole-table count (`scoped=false`) vs filtered count (`scoped=true`).
- **scoping** — identical page with vs without the default scope (soft-delete + tenant filter).
- **join** — records ⋈ categories, one page.
- **sort-paginate** — ordered pagination on an indexed column (index order) vs unindexed (filesort).

## Configuration

All tunables live in **`config/constants.ts`** (not env vars): seed row count, per-engine connection
details, load-generator rate, and the OTLP endpoint. Framework-level env (APP_KEY, PORT, …) is set
inline in `docker-compose.yml`.

## How it works

The app exposes benchmark endpoints; `bench:load` hammers them across every engine × variant. Each run
records an OpenTelemetry histogram `bench_query_duration_ms` (labels: `engine`, `query_type`, `indexed`,
`scoped`) plus DB spans and logs, which the collector fans out to Prometheus, Tempo, and Loki. Grafana
reads all three and renders the comparison dashboard.
