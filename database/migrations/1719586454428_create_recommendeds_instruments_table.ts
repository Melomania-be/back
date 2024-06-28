import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recommendeds_instruments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('recommended_id').unsigned().references('recommendeds.id').onDelete('CASCADE')
      table.integer('instrument_id').unsigned().references('instruments.id').onDelete('CASCADE')
      table.primary(['recommended_id', 'instrument_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
