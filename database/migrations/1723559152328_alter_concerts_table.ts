import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'concerts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('comment').defaultTo('').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('comment', 255).defaultTo('')
    })
  }
}
