import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('contacts')
        .onDelete('SET NULL')
        .nullable()
      // Use .onDelete('CASCADE') if you want the recruitment to be deleted if the contact is deleted.
      // However, for this scenario, 'SET NULL' or 'NO ACTION' is safer if Contact is master.
      // If you are sure a Contact is exclusively for this Recruitment, 'CASCADE' might make sense here.
      // For the purpose of *your* request (deleting Contact when Recruitment deletes), 'SET NULL' is fine.
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('contact_id')
    })
  }
}
