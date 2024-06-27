import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'section_section_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('section_id').unsigned().references('sections.id').onDelete('CASCADE')
      table
        .integer('section_group_id')
        .unsigned()
        .references('section_groups.id')
        .onDelete('CASCADE')

      table.primary(['section_id', 'section_group_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
