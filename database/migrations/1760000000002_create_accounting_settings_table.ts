import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.string('currency', 10).defaultTo('EUR')
      table.boolean('auto_overdue_enabled').defaultTo(true)
      table.integer('default_payment_terms').defaultTo(30)
      table.decimal('tax_rate', 5, 2).defaultTo(20.0)
      table.boolean('enable_tax').defaultTo(false)
      table.timestamp('fiscal_year_start').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['project_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}