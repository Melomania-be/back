// database/migrations/XXXXXX_fix_recruitment_recommendations_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_recommendations'

  async up() {
    // Vérifier si la table existe déjà
    const hasTable = await this.schema.hasTable(this.tableName)

    if (hasTable) {
      // Supprimer la table existante pour la recréer proprement
      this.schema.dropTable(this.tableName)
    }

    // Créer la table avec les bonnes contraintes
    this.schema.createTable(this.tableName, (table) => {
      // Clé primaire auto-incrémentée
      table.increments('id').primary()

      // Relations
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE').notNullable()

      // Informations du recommandeur
      table.string('recommender_name', 255).notNullable()
      table.string('recommender_email', 255).nullable()

      // Informations de la personne recommandée
      table.string('recommended_first_name', 255).notNullable()
      table.string('recommended_last_name', 255).notNullable()
      table.string('recommended_email', 255).nullable()
      table.string('recommended_phone', 255).nullable()
      table.string('recommended_messenger', 255).nullable()
      table.string('recommended_instrument', 255).nullable()
      table.text('recommendation_message').nullable()

      // Statut et traitement
      table.enum('status', ['pending', 'ignored', 'contacted_email', 'contacted_manual']).defaultTo('pending')
      table.integer('recruitment_contact_id').unsigned().references('recruitment_contacts.id').onDelete('SET NULL').nullable()

      // Timestamps avec timezone
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Index pour améliorer les performances
      table.index(['project_id', 'status'], 'idx_recommendations_project_status')
      table.index(['created_at'], 'idx_recommendations_created_at')
      table.index(['status'], 'idx_recommendations_status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
