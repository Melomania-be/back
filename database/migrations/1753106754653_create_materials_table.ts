// database/migrations/1752900000000_create_materials_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'materials'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Relation avec la pièce
      table.integer('piece_id').unsigned().references('pieces.id').onDelete('CASCADE').notNullable()

      // Informations du matériel
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.string('edition', 255).nullable()
      table.string('editor', 255).nullable()
      table.text('notes').nullable()

      // Statut
      table.boolean('is_default').defaultTo(false)
      table.boolean('is_active').defaultTo(true)

      // Métadonnées
      table.integer('files_count').defaultTo(0)
      table.integer('projects_count').defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index
      table.index(['piece_id'])
      table.index(['is_default'])
      table.index(['is_active'])

      // Contrainte unique : nom du matériel unique par pièce
      table.unique(['piece_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
