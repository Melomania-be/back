import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auditions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Relations avec cascade delete
      table.integer('participant_id').unsigned().references('participants.id').onDelete('CASCADE').notNullable()
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE').notNullable()

      // Token sécurisé
      table.string('secure_token', 512).notNullable().unique()

      // Contenu de l'audition
      table.text('instructions').nullable()
      table.json('required_files').nullable()
      table.timestamp('deadline').nullable()

      // Statut de soumission
      table.boolean('is_submitted').defaultTo(false).notNullable()
      table.timestamp('submitted_at').nullable()
      table.text('candidate_notes').nullable()

      // Métadonnées
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index pour performance
      table.index(['participant_id'])
      table.index(['project_id'])
      table.index(['secure_token'])
      table.index(['is_submitted'])
      table.index(['deadline'])

      // Contrainte unique : un participant = une audition par projet
      table.unique(['participant_id', 'project_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
