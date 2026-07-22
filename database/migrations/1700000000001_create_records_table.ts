import { BaseSchema } from '@adonisjs/lucid/schema'

import { TABLES } from '#config/constants'

/**
 * The workload table. Two "twin" columns of identical cardinality drive the
 * index vs no-index comparison:
 *   - `indexed_key`   -> has a btree index
 *   - `unindexed_key` -> deliberately NOT indexed (forces a full scan)
 *
 * `tenant_id` and `deleted_at` are intentionally left unindexed so that
 * applying the default scope (tenant + soft-delete filter) has a measurable
 * cost. `category_id` is indexed to keep the join reasonable.
 */
export default class extends BaseSchema {
  protected tableName = TABLES.records

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('indexed_key').notNullable().index()
      table.integer('unindexed_key').notNullable()
      table.string('status', 20).notNullable()
      table.integer('tenant_id').notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.integer('category_id').notNullable().index()
      table.timestamp('created_at')
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
