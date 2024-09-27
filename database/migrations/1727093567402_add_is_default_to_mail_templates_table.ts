import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddIsDefaultToMailTemplates extends BaseSchema {
  protected tableName = 'mail_templates'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_default').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_default')
    })
  }
}
