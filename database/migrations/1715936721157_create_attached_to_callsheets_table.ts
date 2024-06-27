import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attached_to_callsheets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('file_id').unsigned().references('callsheets.id').onDelete('CASCADE')
      table.integer('callsheet_id').unsigned().references('files.id').onDelete('CASCADE')

      table.primary(['file_id', 'callsheet_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
