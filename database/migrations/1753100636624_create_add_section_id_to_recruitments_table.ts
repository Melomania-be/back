// database/migrations/YYYY_MM_DD_HHMMSS_add_section_id_to_recruitments_table.ts

// import BaseSchema from '@adonisjs/lucid/schema'
import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  protected tableName = 'recruitments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 1. Drop the existing foreign key constraint for section_group_id (if it exists)
      //    You need to know the name of your foreign key constraint.
      //    Common naming convention is 'fk_table_column_name'.
      //    If you don't know it, you can check your previous migration that added it,
      //    or inspect your database schema directly.
      //    If this line causes an error on `node ace migrate`, comment it out and run again.
      table.dropForeign(['section_group_id'])

      // 2. Drop the section_group_id column
      table.dropColumn('section_group_id')

      // 3. Add the new section_id column
      table
        .integer('section_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('sections')
        .onDelete('SET NULL')
      // .nullable() is important if a recruitment can exist without a section initially.
      // .onDelete('SET NULL') means if a section is deleted, recruitments linked to it will have section_id set to NULL.
      // Adjust onDelete behavior if needed (e.g., 'RESTRICT', 'CASCADE').
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert changes in reverse order for rollback
      // 1. Drop the new section_id column
      table.dropForeign(['section_id']) // Drop foreign key first
      table.dropColumn('section_id')

      // 2. Add back the section_group_id column (assuming it was integer and not null)
      table
        .integer('section_group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('section_groups')
        .onDelete('RESTRICT')
      // IMPORTANT: Adjust .notNullable() and .onDelete() to match its ORIGINAL definition
      // If it was originally nullable, use .nullable()
      // If it had a different onDelete, use that.
      table.index(['section_group_id']) // Add back any original indexes
    })
  }
}
