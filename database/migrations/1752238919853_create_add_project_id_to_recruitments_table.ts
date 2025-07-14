// database/migrations/<timestamp>_add_project_id_to_recruitments_table.ts

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitments' // This migration alters the 'recruitments' table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add a new column 'project_id'
      // It's an unsigned integer, nullable (to allow moving between projects or unassigned state)
      // It references the 'id' column in the 'projects' table.
      // onDelete('SET NULL') means if a project is deleted, any associated recruitments will have their project_id set to NULL.
      // This is generally safer than RESTRICT or CASCADE for this type of relationship,
      // as you might not want to delete recruitments just because a project is gone.
      table
        .integer('project_id')
        .unsigned()
        .nullable() // IMPORTANT: Made nullable to allow moving between projects / unassigned state
        .references('id')
        .inTable('projects')
        .onDelete('SET NULL') // If a project is deleted, set project_id to NULL
        .after('comment') // Optional: position the column after 'comment' for readability
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // In case of rollback, drop the foreign key constraint first, then the column
      table.dropForeign(['project_id'])
      table.dropColumn('project_id')
    })
  }
}
