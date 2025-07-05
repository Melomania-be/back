// database/migrations/XXXX_create_audition_files_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audition_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Relations avec cascade delete
      table.integer('audition_id').unsigned().references('auditions.id').onDelete('CASCADE').notNullable()
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE').notNullable()

      // Type de fichier avec enum restreint
      table.enum('file_type', ['video', 'audio']).notNullable()
      table.string('description', 500).nullable()

      // Métadonnées du fichier
      table.bigInteger('file_size').unsigned().nullable() // Taille en bytes
      table.integer('duration_seconds').unsigned().nullable() // Durée pour audio/vidéo

      // Timestamps
      table.timestamp('uploaded_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Index pour performance
      table.index(['audition_id'])
      table.index(['file_type'])
      table.index(['uploaded_at'])

      // Contrainte : un fichier ne peut être attaché qu'une fois à une audition
      table.unique(['audition_id', 'file_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
