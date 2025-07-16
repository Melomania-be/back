import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'add_filesystem_structure'

  async up() {
    // Modifier la table folders
    this.schema.alterTable('folders', (table) => {
      table.integer('parent_id').unsigned().references('folders.id').onDelete('CASCADE')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('piece_id').unsigned().references('pieces.id').onDelete('CASCADE')
      table.boolean('is_system_generated').defaultTo(false)

      // Index pour les performances
      table.index('parent_id')
      table.index('project_id')
      table.index('piece_id')
      table.index('is_system_generated')
    })

    // Modifier la table files
    this.schema.alterTable('files', (table) => {
      table.integer('folder_id').unsigned().references('folders.id').onDelete('CASCADE')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('piece_id').unsigned().references('pieces.id').onDelete('CASCADE')

      // Index pour les performances
      table.index('folder_id')
      table.index('project_id')
      table.index('piece_id')
    })
  }

  async down() {
    // Rollback folders
    this.schema.alterTable('folders', (table) => {
      table.dropIndex('parent_id')
      table.dropIndex('project_id')
      table.dropIndex('piece_id')
      table.dropIndex('is_system_generated')

      table.dropColumn('parent_id')
      table.dropColumn('project_id')
      table.dropColumn('piece_id')
      table.dropColumn('is_system_generated')
    })

    // Rollback files
    this.schema.alterTable('files', (table) => {
      table.dropIndex('folder_id')
      table.dropIndex('project_id')
      table.dropIndex('piece_id')

      table.dropColumn('folder_id')
      table.dropColumn('project_id')
      table.dropColumn('piece_id')
    })
  }
}
