// database/migrations/1754700000000_add_contacted_by_to_recruitment_contacts_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('contacted_by', 255).nullable()
      table.index(['contacted_by'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['contacted_by'])
      table.dropColumn('contacted_by')
    })
  }
}
