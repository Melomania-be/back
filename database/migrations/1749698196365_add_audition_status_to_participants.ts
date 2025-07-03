import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participants'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('audition_status').defaultTo('none') // 'none', 'pending', 'completed'
      table.timestamp('audition_requested_at').nullable()
      table.timestamp('audition_deadline').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('audition_status')
      table.dropColumn('audition_requested_at')
      table.dropColumn('audition_deadline')
    })
  }
}
