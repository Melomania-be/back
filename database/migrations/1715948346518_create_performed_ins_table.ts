import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'performed_ins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('piece_id').unsigned().references('pieces.id').onDelete('CASCADE')
      table.primary(['project_id', 'piece_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
