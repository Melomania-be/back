import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participates_in_concerts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('participant_id').unsigned().references('participants.id').onDelete('CASCADE')
      table.integer('concert_id').unsigned().references('concerts.id').onDelete('CASCADE')

      table.primary(['participant_id', 'concert_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
