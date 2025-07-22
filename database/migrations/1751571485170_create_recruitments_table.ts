import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table
        .integer('section_group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('section_groups')
        .onDelete('RESTRICT')

      table.date('contact_date').nullable() // updated

      table
        .integer('contacted_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')

      table
        .enu('status', [
          'not yet contacted',
          'awaiting response',
          'interested',
          'participating',
          'registered',
          'not available',
          'to follow up',
          'pending validation',
          'cancelled',
          'other',
        ])
        .notNullable()
        .defaultTo('not yet contacted')

      table.timestamp('status_updated_at', { useTz: true }).defaultTo(this.now()).notNullable()

      table.text('comment').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
