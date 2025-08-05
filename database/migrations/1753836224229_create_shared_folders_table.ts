// database/migrations/2024_xx_xx_create_shared_folders_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'shared_folders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Référence au dossier partagé
      table.integer('folder_id').unsigned().references('id').inTable('folders').onDelete('CASCADE')

      // Token unique pour l'accès
      table.string('token', 50).notNullable().unique()

      // Statistiques d'usage
      table.integer('view_count').defaultTo(0)

      // État du partage
      table.boolean('is_active').defaultTo(true)

      // Date d'expiration optionnelle
      table.timestamp('expires_at', { useTz: true }).nullable()

      // Timestamps
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    // Index pour une recherche rapide par token
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['token'], 'shared_folders_token_index')
      table.index(['folder_id'], 'shared_folders_folder_id_index')
      table.index(['is_active'], 'shared_folders_is_active_index')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
