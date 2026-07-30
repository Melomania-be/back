import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'content_registrations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('order').defaultTo(0)
      table.string('position').defaultTo('below')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('order')
      table.dropColumn('position')
    })
  }
}