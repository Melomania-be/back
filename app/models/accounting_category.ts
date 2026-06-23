import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'

export default class AccountingCategory extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare is_default: boolean

  @column()
  declare color: string | null

  @column()
  declare icon: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      name: this.name || '',
      description: this.description || null,
      is_default: Boolean(this.is_default),
      color: this.color || null,
      icon: this.icon || null,
      created_at: this.createdAt && this.createdAt.isValid ? this.createdAt.toISO() : null,
      updated_at: this.updatedAt && this.updatedAt.isValid ? this.updatedAt.toISO() : null,
    }
  }

  static async getOrCreateDefaults(): Promise<AccountingCategory[]> {
    const existingDefaults = await this.query().where('is_default', true)

    if (existingDefaults.length > 0) {
      return existingDefaults
    }

    const defaultCategories = [
      {
        name: 'Cachets musiciens',
        description: 'Rémunération des musiciens',
        is_default: true,
        color: '#3B82F6',
        icon: 'Music',
      },
      {
        name: 'Location de salle',
        description: 'Frais de location de salle',
        is_default: true,
        color: '#10B981',
        icon: 'Building',
      },
      {
        name: 'Matériel',
        description: 'Achat ou location de matériel',
        is_default: true,
        color: '#F59E0B',
        icon: 'Tool',
      },
      {
        name: 'Communication',
        description: 'Frais de communication et marketing',
        is_default: true,
        color: '#8B5CF6',
        icon: 'Megaphone',
      },
      {
        name: 'Transport',
        description: 'Frais de déplacement',
        is_default: true,
        color: '#EC4899',
        icon: 'Car',
      },
      {
        name: 'Billetterie',
        description: 'Revenus de la billetterie',
        is_default: true,
        color: '#14B8A6',
        icon: 'Ticket',
      },
      {
        name: 'Subventions',
        description: 'Subventions et aides',
        is_default: true,
        color: '#06B6D4',
        icon: 'DollarSign',
      },
      {
        name: 'Autres',
        description: 'Autres dépenses ou revenus',
        is_default: true,
        color: '#6B7280',
        icon: 'MoreHorizontal',
      },
    ]

    const created: AccountingCategory[] = []
    for (const categoryData of defaultCategories) {
      const category = await this.create(categoryData)
      created.push(category)
    }

    return created
  }
}
