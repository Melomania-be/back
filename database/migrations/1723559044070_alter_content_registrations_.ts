import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'content_registrations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('text').defaultTo('').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('text', 255).defaultTo('')
    })
  }
}