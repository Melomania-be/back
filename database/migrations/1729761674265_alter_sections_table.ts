import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'section_section_groups'

  async up() {
    this.schema.table(this.tableName, (table) => {
      table.integer('order').defaultTo(0)
    })
  }

  async down() {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('order')
    })
  }
}
