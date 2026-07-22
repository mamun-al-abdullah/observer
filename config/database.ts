import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

import { CONNECTIONS } from '#config/constants'

/**
 * Four SQL connections, one per engine under test. MariaDB speaks the MySQL
 * wire protocol, so it uses the same `mysql2` client. All values come from
 * the global constants module, never from environment variables.
 *
 * Queries are routed per engine with `db.connection('<key>')`.
 */
const dbConfig = defineConfig({
  connection: 'postgres',

  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        host: CONNECTIONS.mysql.host,
        port: CONNECTIONS.mysql.port,
        user: CONNECTIONS.mysql.user,
        password: CONNECTIONS.mysql.password,
        database: CONNECTIONS.mysql.database,
      },
      pool: { min: 0, max: 12 },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },

    mariadb: {
      client: 'mysql2',
      connection: {
        host: CONNECTIONS.mariadb.host,
        port: CONNECTIONS.mariadb.port,
        user: CONNECTIONS.mariadb.user,
        password: CONNECTIONS.mariadb.password,
        database: CONNECTIONS.mariadb.database,
      },
      pool: { min: 0, max: 12 },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },

    postgres: {
      client: 'pg',
      connection: {
        host: CONNECTIONS.postgres.host,
        port: CONNECTIONS.postgres.port,
        user: CONNECTIONS.postgres.user,
        password: CONNECTIONS.postgres.password,
        database: CONNECTIONS.postgres.database,
      },
      pool: { min: 0, max: 12 },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },

    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: app.makePath(CONNECTIONS.sqlite.filename),
      },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
