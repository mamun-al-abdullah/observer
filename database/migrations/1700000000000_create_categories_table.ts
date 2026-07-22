import { BaseSchema } from '@adonisjs/lucid/schema'

import { TABLES } from '#config/constants'

export default class extends BaseSchema {
  protected tableName = TABLES.categories

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
