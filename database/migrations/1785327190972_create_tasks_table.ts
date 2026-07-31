import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.dropTableIfExists(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Informations de base
      table.string('title').notNullable()
      table.text('description').nullable()

      // Catégorisation (Enums)
      table.enum('status', ['todo', 'in_progress', 'done']).defaultTo('todo')
      table.enum('priority', ['low', 'medium', 'high']).defaultTo('medium')
      table.enum('task_type', ['logistic', 'musical', 'administrative', 'communication']).defaultTo('logistic')
      table.enum('visibility', ['private', 'section', 'all']).defaultTo('all')

      // Planification
      table.timestamp('due_date', { useTz: true }).nullable()
      table.boolean('is_recurring').defaultTo(false)
      table.string('recurrence_rule').nullable()

      // Clés étrangères (Relations)
      table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE')
      table.integer('event_id').unsigned().nullable()
      table.integer('piece_id').unsigned().references('id').inTable('pieces').onDelete('SET NULL')
      table.integer('section_id').unsigned().references('id').inTable('sections').onDelete('SET NULL')

      // Utilisateurs assigné et créateur
      table.integer('assignee_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('CASCADE')

      // Timestamps
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
