import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'files'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('content').defaultTo('').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('content', 255)
    })
  }
}
