import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mobile_notification_multi_tenant_alignment'

  async up() {
    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS organization_id integer
      `)

      await db.rawQuery(`
        ALTER TABLE device_tokens
        ADD COLUMN IF NOT EXISTS organization_id integer
      `)

      await db.rawQuery(`
        UPDATE notifications n
        SET organization_id = COALESCE(u.organization_id, p.organization_id)
        FROM users u, projects p
        WHERE n.organization_id IS NULL
          AND n.user_id = u.id
          AND p.id = n.project_id
      `)

      await db.rawQuery(`
        UPDATE notifications n
        SET organization_id = u.organization_id
        FROM users u
        WHERE n.organization_id IS NULL
          AND n.user_id = u.id
      `)

      await db.rawQuery(`
        UPDATE device_tokens dt
        SET organization_id = u.organization_id
        FROM users u
        WHERE dt.organization_id IS NULL
          AND dt.user_id = u.id
      `)

      await db.rawQuery(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'notifications_organization_id_foreign'
          ) THEN
            ALTER TABLE notifications
            ADD CONSTRAINT notifications_organization_id_foreign
            FOREIGN KEY (organization_id)
            REFERENCES organizations (id)
            ON DELETE CASCADE;
          END IF;
        END $$;
      `)

      await db.rawQuery(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'device_tokens_organization_id_foreign'
          ) THEN
            ALTER TABLE device_tokens
            ADD CONSTRAINT device_tokens_organization_id_foreign
            FOREIGN KEY (organization_id)
            REFERENCES organizations (id)
            ON DELETE CASCADE;
          END IF;
        END $$;
      `)

      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS notifications_organization_id_index
        ON notifications (organization_id)
      `)

      await db.rawQuery(`
        CREATE INDEX IF NOT EXISTS device_tokens_organization_id_index
        ON device_tokens (organization_id)
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_token_organization_id_unique
        ON device_tokens (token, organization_id)
      `)
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(`DROP INDEX IF EXISTS device_tokens_token_organization_id_unique`)
      await db.rawQuery(`DROP INDEX IF EXISTS device_tokens_organization_id_index`)
      await db.rawQuery(`DROP INDEX IF EXISTS notifications_organization_id_index`)
      await db.rawQuery(`ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS device_tokens_organization_id_foreign`)
      await db.rawQuery(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_organization_id_foreign`)
      await db.rawQuery(`ALTER TABLE device_tokens DROP COLUMN IF EXISTS organization_id`)
      await db.rawQuery(`ALTER TABLE notifications DROP COLUMN IF EXISTS organization_id`)
    })
  }
}
