import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participants'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('audition_status', ['none', 'pending', 'completed', 'expired']).defaultTo('none')
      table.timestamp('audition_requested_at').nullable()
      table.timestamp('audition_deadline').nullable()

      // Index pour les requêtes d'audition
      table.index(['audition_status'])
      table.index(['audition_deadline'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['audition_status'])
      table.dropIndex(['audition_deadline'])
      table.dropColumn('audition_status')
      table.dropColumn('audition_requested_at')
      table.dropColumn('audition_deadline')
    })
  }
}
