import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_alerts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // ID of the newly created recruitment (the potential duplicate)
      table
        .integer('new_recruitment_id')
        .unsigned()
        .references('id')
        .inTable('recruitments')
        .onDelete('CASCADE')

      // ID of the existing recruitment that is similar
      table
        .integer('similar_to_recruitment_id')
        .unsigned()
        .references('id')
        .inTable('recruitments')
        .onDelete('SET NULL')

      table.string('alert_type').notNullable() // e.g., 'similarity_conflict'
      table.text('message').nullable() // e.g., "New recruit 'X Y' is similar to existing 'A B'."
      table.boolean('is_resolved').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
