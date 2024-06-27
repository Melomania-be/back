import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contains'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('folder_id').unsigned().references('folders.id').onDelete('CASCADE')
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE')

      table.primary(['folder_id', 'file_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
