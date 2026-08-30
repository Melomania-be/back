import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activity_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      
      // Links to the user. 'CASCADE' means if the user is deleted, their logs are deleted too.
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      
      table.string('action').notNullable() 
      table.string('ip_address').nullable()
      table.string('user_agent').nullable() 
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}