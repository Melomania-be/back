import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'content_callsheets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('display_order').defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('display_order')
    })
  }
}
