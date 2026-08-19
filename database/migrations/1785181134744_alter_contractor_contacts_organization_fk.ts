import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contractor_contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove the existing foreign key
      table.dropForeign(['organization_id'])

      // Recreate it with RESTRICT
      table
        .foreign('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove the RESTRICT foreign key
      table.dropForeign(['organization_id'])

      // Restore the original behavior
      table
        .foreign('organization_id')
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
    })
  }
}