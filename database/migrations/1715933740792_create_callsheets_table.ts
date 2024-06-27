import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'callsheets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('version')
      table.integer('project_id').unsigned().references('id').inTable('projects')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
  async down() {
    this.schema.dropTable(this.tableName)
  }
}
