import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'played_in_sections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('sections_id').unsigned().references('sections.id').onDelete('CASCADE')
      table.integer('instrument_id').unsigned().references('instruments.id').onDelete('CASCADE')

      table.primary(['sections_id', 'instrument_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
