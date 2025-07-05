import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audition_pdf_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Relations avec cascade delete
      table.integer('audition_id').unsigned().references('auditions.id').onDelete('CASCADE').notNullable()
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE').notNullable()
      table.integer('section_id').unsigned().references('sections.id').onDelete('CASCADE').notNullable()

      // Métadonnées du PDF
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.integer('order').defaultTo(0).notNullable()

      // Statut de téléchargement
      table.boolean('downloaded_by_candidate').defaultTo(false)
      table.timestamp('first_downloaded_at').nullable()
      table.integer('download_count').defaultTo(0)

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index pour performance
      table.index(['audition_id'])
      table.index(['section_id'])
      table.index(['order'])

      // Contrainte unique
      table.unique(['audition_id', 'file_id', 'title'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
