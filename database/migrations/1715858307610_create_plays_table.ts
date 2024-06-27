import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plays'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('contact_id').unsigned().references('contacts.id').onDelete('CASCADE')
      table.integer('instrument_id').unsigned().references('instruments.id').onDelete('CASCADE')
      table.string('proficiency_level').defaultTo('unknown')

      table.primary(['contact_id', 'instrument_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
