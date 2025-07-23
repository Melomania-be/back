import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.date('bill_date').nullable()
      table.date('payment_date').nullable()
      table.string('name').notNullable()
      table.decimal('amount', 12, 2).notNullable()
      table.string('attachement').nullable()
      table.boolean('is_individual_payment').defaultTo(false)

      table
        .integer('category_id')
        .unsigned()
        .references('id')
        .inTable('expense_categories')
        .onDelete('SET NULL')
        .nullable()

      table
        .integer('project_id')
        .unsigned()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
        .notNullable()

      table
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('contacts')
        .onDelete('CASCADE')
        .nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
