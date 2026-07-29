import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'device_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('CASCADE')
      table.integer('contact_id').unsigned().nullable().references('contacts.id').onDelete('CASCADE')
      table.integer('organization_id').unsigned().nullable().references('organizations.id').onDelete('CASCADE')
      table.string('platform', 30).notNullable()
      table.string('provider', 30).notNullable().defaultTo('fcm')
      table.string('token', 2048).notNullable()
      table.string('device_label', 255).nullable()
      table.string('app_version', 50).nullable()
      table.timestamp('last_seen_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id'])
      table.index(['contact_id'])
      table.index(['organization_id'])
      table.index(['platform'])
      table.unique(['token', 'organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
