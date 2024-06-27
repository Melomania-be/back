import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participates_ins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('rehearsal_id').unsigned().references('rehearsals.id').onDelete('CASCADE')
      table.integer('participant_id').unsigned().references('participants.id').onDelete('CASCADE')
      table.primary(['rehearsal_id', 'participant_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
