import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auditions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('participant_id').unsigned().references('participants.id').onDelete('CASCADE')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.string('secure_token', 255).notNullable().unique()
      table.text('instructions').nullable()
      table.json('required_files').nullable()
      table.timestamp('deadline').nullable()
      table.boolean('is_submitted').defaultTo(false)
      table.timestamp('submitted_at').nullable()
      table.text('candidate_notes').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
