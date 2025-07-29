import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_alerts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('resolved_at', { useTz: true }).nullable() // Add this line
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('resolved_at') // Add this line for rollback
    })
  }
}
