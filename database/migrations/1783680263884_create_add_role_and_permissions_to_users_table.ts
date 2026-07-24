import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // ✅ Rôle de l'utilisateur : superadmin / user / guest
      table
        .enum('role', ['superadmin', 'user', 'guest'])
        .notNullable()
        .defaultTo('user')

      // ✅ Permissions granulaires (superadmin peut les désactiver)
      table.boolean('can_access_contacts').notNullable().defaultTo(true)
      table.boolean('can_export_contacts').notNullable().defaultTo(true)
      table.boolean('is_active').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('can_access_contacts')
      table.dropColumn('can_export_contacts')
      table.dropColumn('is_active')
    })
  }
}
