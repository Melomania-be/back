import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'section_pdfs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Relations avec cascade delete
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE').notNullable()
      table.integer('section_id').unsigned().references('sections.id').onDelete('CASCADE').notNullable()
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE').notNullable()

      // Métadonnées du PDF
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.integer('order').defaultTo(0).notNullable()

      // Configuration d'audition
      table.boolean('is_required').defaultTo(true)
      table.boolean('is_active').defaultTo(true)

      // Statistiques d'usage
      table.integer('auditions_count').defaultTo(0)

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index pour performance
      table.index(['project_id', 'section_id'])
      table.index(['is_active'])
      table.index(['order'])

      // Contrainte unique
      table.unique(['project_id', 'section_id', 'file_id', 'title'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
