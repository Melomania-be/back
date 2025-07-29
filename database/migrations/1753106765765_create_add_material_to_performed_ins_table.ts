// database/migrations/1752900000001_add_material_to_performed_ins_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'performed_ins'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Référence au matériel utilisé dans ce projet
      table.integer('material_id').unsigned().references('materials.id').onDelete('SET NULL').nullable()

      // Statut du matériel pour ce projet
      table.boolean('material_specified').defaultTo(false)

      // Index
      table.index(['material_id'])
      table.index(['material_specified'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['material_id'])
      table.dropIndex(['material_specified'])
      table.dropColumn('material_id')
      table.dropColumn('material_specified')
    })
  }
}
