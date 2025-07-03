// database/migrations/create_section_pdfs_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'section_pdfs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('section_id').unsigned().references('sections.id').onDelete('CASCADE')
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE')
      table.string('title').notNullable()
      table.text('description').nullable()
      table.integer('order').defaultTo(0)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index pour la performance
      table.index(['project_id', 'section_id'])
      table.unique(['project_id', 'section_id', 'file_id', 'title'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
