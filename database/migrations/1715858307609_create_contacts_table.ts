import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('first_name', 255).notNullable()
      table.string('last_name', 255).notNullable()
      table.string('email', 255).defaultTo('')
      table.string('phone', 255).defaultTo('')
      table.string('messenger', 255).defaultTo('')
      table.string('comments', 255).defaultTo('')
      table.boolean('validated').defaultTo(false).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
