import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'content_callsheets'

  async up() {
    // Étape 1 : ajouter la colonne
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('position').notNullable().defaultTo(0)
    })

    // Étape 2 : initialiser les positions APRÈS que le schéma est appliqué
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE content_callsheets cc
        SET position = sub.row_num - 1
        FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY callsheet_id ORDER BY created_at ASC) as row_num
          FROM content_callsheets
        ) sub
        WHERE cc.id = sub.id
      `)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('position')
    })
  }
}
