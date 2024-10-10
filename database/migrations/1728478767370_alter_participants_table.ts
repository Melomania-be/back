import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participants'

  async up() {
    this.schema.table(this.tableName, (table) => {
      table.boolean('is_section_leader').defaultTo(false)
    })
  }

  async down() {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('is_section_leader')
    })
  }
}
