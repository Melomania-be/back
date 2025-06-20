// database/migrations/<timestamp>_create_recruitments_table.ts

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('first_name', 100).notNullable() // Change here
      table.string('last_name', 100).notNullable() // Change here
      table
        .integer('section_group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('section_groups')
        .onDelete('RESTRICT')
      table.date('contact_date').notNullable() // Already snake_case, good!
      table
        .integer('contacted_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table
        .enu('status', [
          'awaiting response',
          'interested',
          'participating',
          'registered',
          'not available',
          'to be contacted',
          'cancelled',
          'other',
          'withdrawn',
        ])
        .notNullable()
      table.timestamp('status_updated_at', { useTz: true }).defaultTo(this.now()).notNullable() // Change here for consistency, if desired
      table.text('comment').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
