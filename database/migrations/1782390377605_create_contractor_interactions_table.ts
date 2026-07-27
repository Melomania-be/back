import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contractor_interactions'

  async up() {
  this.schema.createTable(this.tableName, (table) => {
    table.increments('id')

    table
      .integer('contractor_contact_id')
      .unsigned()
      .references('id')
      .inTable('contractor_contacts')
      .onDelete('CASCADE')

    table.date('interaction_date').notNullable()

    table.text('description').notNullable()

    table.timestamp('created_at')
    table.timestamp('updated_at')
  })
}
  async down() {
    this.schema.dropTable(this.tableName)
  }
}