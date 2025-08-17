import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('auto_import_enabled').defaultTo(false)
      table.timestamp('last_auto_import').nullable()

      table.index(['auto_import_enabled'])
      table.index(['last_auto_import'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['auto_import_enabled'])
      table.dropIndex(['last_auto_import'])
      table.dropColumn('auto_import_enabled')
      table.dropColumn('last_auto_import')
    })
  }
}
