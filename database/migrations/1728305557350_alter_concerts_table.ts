import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concerts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('date', 'start_date')
      table.dateTime('end_date').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('start_date', 'date')
      table.dropColumn('end_date')
    })
  }
}
