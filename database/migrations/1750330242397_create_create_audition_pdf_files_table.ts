// database/migrations/create_audition_pdf_files_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audition_pdf_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('audition_id').unsigned().references('auditions.id').onDelete('CASCADE')
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE')
      table.integer('section_id').unsigned().references('sections.id').onDelete('CASCADE')
      table.string('title').notNullable() // ex: "Partition principale", "Exercice technique"
      table.text('description').nullable()
      table.integer('order').defaultTo(0) // pour l'ordre d'affichage
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
