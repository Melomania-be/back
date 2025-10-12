import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting_categories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.boolean('is_default').defaultTo(false)
      table.string('color', 50).nullable()
      table.string('icon', 50).nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index
      table.index(['name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}