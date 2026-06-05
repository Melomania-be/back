import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // Link to the user requesting the reset
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      
      // The secure token string
      table.string('token').notNullable().unique()
      
      // Tokens must expire (usually after 15-30 minutes)
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}