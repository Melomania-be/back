import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 1. Lier la tâche à un utilisateur (Optionnel au début pour ne pas casser les tâches existantes)
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL')

      // 2. Ajouter la priorité (Par défaut à 'medium')
      table.string('priority').defaultTo('medium').notNullable()

      // 3. Ajouter la colonne pour le Soft Delete (Corbeille)
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
      table.dropColumn('priority')
      table.dropColumn('deleted_at')
    })
  }
}
