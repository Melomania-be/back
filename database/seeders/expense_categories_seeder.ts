import ExpenseCategory from '#models/expense_category'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  public async run() {
    const defaultCategories = [
      {
        name: 'Musician payments',
        description: 'Paiements aux musiciens',
        color: '#3B82F6' // Bleu
      },
      {
        name: 'Musician reimbursements',
        description: 'Remboursements aux musiciens',
        color: '#F59E0B' // Orange
      },
      {
        name: 'Sheet music printing',
        description: 'Impression de partitions',
        color: '#10B981' // Vert
      },
      {
        name: 'Advertising costs',
        description: 'Coûts publicitaires',
        color: '#EF4444' // Rouge
      },
      {
        name: 'Day-to-day management',
        description: 'Gestion quotidienne',
        color: '#8B5CF6' // Violet
      },
      {
        name: 'Venue rental',
        description: 'Location de salles',
        color: '#F97316' // Orange foncé
      },
      {
        name: 'Equipment rental',
        description: 'Location d\'équipement',
        color: '#059669' // Vert foncé
      },
      {
        name: 'Ticket sales',
        description: 'Vente de billets (revenus)',
        color: '#DC2626' // Rouge foncé
      },
      {
        name: 'Donations',
        description: 'Donations et subventions (revenus)',
        color: '#7C3AED' // Violet foncé
      },
      {
        name: 'Miscellaneous',
        description: 'Divers',
        color: '#6B7280' // Gris
      }
    ]

    for (const category of defaultCategories) {
      await ExpenseCategory.updateOrCreate(
        { name: category.name },
        {
          ...category,
          isDefault: true,
        }
      )
    }

    console.log('✅ Default expense categories created/updated successfully')
  }
}
