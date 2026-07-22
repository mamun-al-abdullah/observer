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

**First time** (start everything + seed the data):

```bash
npm run setup    # start stack -> seed all engines -> start load generator
```

**Every time after that** — one command starts everything (data persists in volumes):

```bash
npm start        # starts the whole stack + load generator
```

Then open:

- **Grafana** → http://localhost:3001 → dashboard **“Query Latency Comparison”** (anonymous admin, no login)
- **API** → http://localhost:3333

Scale the dataset up (into the millions):

```bash
docker compose exec app node ace bench:seed all --rows=1000000
```

### All commands

Available as npm scripts (works anywhere `docker compose` is installed) and as `make` targets:

| npm | make | Description |
|---|---|---|
| `npm start` | `make start` | **Start everything** — stack + load generator |
| `npm run setup` | `make setup` | First run: start stack, seed, start load generator |
| `npm run up` | `make up` | Start the stack **without** the load generator |
| `npm run seed` | `make seed` | Migrate all SQL engines + seed every engine |
| `npm run load:start` | `make load-start` | Start the load generator |
| `npm run load:stop` | `make load-stop` | Stop the load generator |
| `npm run stop` | — | Stop containers (keep data) |
| `npm run down` | `make down` | Stop & remove containers (keep data) |
| `npm run clean` | `make clean` | Stop & delete all data volumes |
| `npm run restart:app` | `make restart-app` | Bounce just the app (stack must be running) |
| `npm run logs:app` | `make logs-app` | Tail the app logs |
| `npm run ps` | `make ps` | Container status |
| `npm run grafana` | — | Open Grafana in the browser (macOS) |

> **Resuming after `stop`/`down`:** run `npm start` (or `npm run up`) — it starts the
> whole stack. `npm run restart:app` only bounces the **app** container and does not
> start the databases, so use it only while the stack is already running.

## API

| Method & path | Description |
|---|---|
| `GET /engines` | Engine health + seeded row counts + available query variants |
| `GET /bench/:engine/:queryType?indexed=&scoped=&limit=` | Run one variant against one engine, return latency |
| `GET /bench/compare/:queryType?indexed=&scoped=` | Run one variant across **all** engines |
| `POST /seed/:engine?rows=` | Reseed one engine (or `all`) — prefer `npm run seed` for big loads |

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
