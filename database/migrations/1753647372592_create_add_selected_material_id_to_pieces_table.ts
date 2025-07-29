import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pieces'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Ajouter la colonne pour stocker le matériel sélectionné pour chaque pièce
      table.integer('selected_material_id').unsigned().nullable()

      // Créer la contrainte de clé étrangère vers la table materials
      table.foreign('selected_material_id').references('id').inTable('materials').onDelete('SET NULL')

      // Ajouter un index pour améliorer les performances des requêtes
      table.index('selected_material_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Supprimer la contrainte de clé étrangère en premier
      table.dropForeign(['selected_material_id'])

      // Supprimer l'index
      table.dropIndex(['selected_material_id'])

      // Supprimer la colonne
      table.dropColumn('selected_material_id')
    })
  }
}
