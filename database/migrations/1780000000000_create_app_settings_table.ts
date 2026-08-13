import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'app_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('logo_path').nullable()
      table.string('logo_file_name').nullable()
      table.string('background_image_path').nullable()
      table.string('background_file_name').nullable()
      table.string('primary_color', 20).defaultTo('#343CAD')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
