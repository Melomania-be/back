import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pieces'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name')
      table.string('opus')
      table.string('year_of_composition')
      table.integer('composer_id').unsigned().references('composers.id')
      table.integer('type_of_piece_id').unsigned().references('type_of_pieces.id')
      table.integer('folder_id').unsigned().references('folders.id')
      table.string('arranger')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
