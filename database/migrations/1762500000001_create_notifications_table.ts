import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('CASCADE')
      table.integer('contact_id').unsigned().nullable().references('contacts.id').onDelete('CASCADE')
      table.integer('project_id').unsigned().nullable().references('projects.id').onDelete('CASCADE')
      table.integer('actor_user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.integer('organization_id').unsigned().nullable().references('organizations.id').onDelete('CASCADE')
      table.string('type', 100).notNullable()
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.jsonb('data').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('sent_push_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id'])
      table.index(['contact_id'])
      table.index(['project_id'])
      table.index(['organization_id'])
      table.index(['type'])
      table.index(['read_at'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
