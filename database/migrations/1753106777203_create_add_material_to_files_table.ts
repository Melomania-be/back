// database/migrations/1752900000002_add_material_to_files_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'files'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Référence au matériel auquel appartient ce fichier
      table.integer('material_id').unsigned().references('materials.id').onDelete('CASCADE').nullable()

      // Type d'instrument/partie pour ce fichier dans le matériel
      table.string('instrument_part', 255).nullable()
      table.integer('part_order').defaultTo(0)

      // Index
      table.index(['material_id'])
      table.index(['material_id', 'part_order'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['material_id'])
      table.dropIndex(['material_id', 'part_order'])
      table.dropColumn('material_id')
      table.dropColumn('instrument_part')
      table.dropColumn('part_order')
    })
  }
}
