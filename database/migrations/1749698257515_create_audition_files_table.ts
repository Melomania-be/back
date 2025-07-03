import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audition_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('audition_id').unsigned().references('auditions.id').onDelete('CASCADE')
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE')
      table.string('file_type') // 'video', 'audio', 'pdf', 'image'
      table.string('description').nullable()
      table.timestamp('uploaded_at')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
