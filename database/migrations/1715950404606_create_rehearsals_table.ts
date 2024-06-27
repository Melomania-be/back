import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rehearsals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.dateTime('date')
      table.string('comment')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.string('place')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
