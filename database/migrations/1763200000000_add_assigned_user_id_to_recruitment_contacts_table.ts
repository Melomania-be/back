import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('assigned_user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.index(['assigned_user_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE recruitment_contacts rc
        SET assigned_user_id = u.id
        FROM users u
        WHERE rc.assigned_user_id IS NULL
          AND rc.contacted_by IS NOT NULL
          AND (
            LOWER(TRIM(COALESCE(u.full_name, ''))) = LOWER(TRIM(rc.contacted_by))
            OR LOWER(TRIM(u.email)) = LOWER(TRIM(rc.contacted_by))
          )
      `)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['assigned_user_id'])
      table.dropColumn('assigned_user_id')
    })
  }
}
