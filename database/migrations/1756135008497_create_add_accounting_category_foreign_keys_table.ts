import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting'

  async up() {
    // Ajouter la contrainte de clé étrangère après que expense_categories existe
    this.schema.alterTable(this.tableName, (table) => {
      table
        .foreign('category_id')
        .references('id')
        .inTable('expense_categories')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['category_id'])
    })
  }
}
