import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contractor_interaction_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('contractor_interaction_id')
        .unsigned()
        .references('id')
        .inTable('contractor_interactions')
        .onDelete('CASCADE')
        .notNullable()

      table
        .integer('file_id')
        .unsigned()
        .references('id')
        .inTable('files')
        .onDelete('CASCADE')
        .notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}