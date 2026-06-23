import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // Immediately seed a default organization for legacy data mapping
    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        name: 'Melomania Legacy Data',
        created_at: new Date(),
        updated_at: new Date()
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}