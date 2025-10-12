import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table
        .integer('contact_id')
        .unsigned()
        .references('contacts.id')
        .onDelete('CASCADE')
        .nullable()
      table
        .integer('category_id')
        .unsigned()
        .references('accounting_categories.id')
        .onDelete('SET NULL')
        .nullable()

      // Informations de base
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.decimal('amount', 12, 2).notNullable()

      // Type et statut
      table.enum('entry_type', ['expense', 'income']).defaultTo('expense')
      table
        .enum('payment_status', ['pending', 'paid', 'overdue', 'cancelled'])
        .defaultTo('pending')

      // Dates
      table.date('bill_date').nullable()
      table.date('payment_date').nullable()
      table.date('due_date').nullable()

      // Métadonnées
      table.string('attachment').nullable()
      table.boolean('is_individual_payment').defaultTo(false)
      table.boolean('is_musician_fee').defaultTo(false)
      table.string('invoice_number').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index
      table.index(['project_id', 'payment_status'])
      table.index(['entry_type'])
      table.index(['payment_date'])
      table.index(['due_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}