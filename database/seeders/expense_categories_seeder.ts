import ExpenseCategory from '#models/expense_category'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  public async run() {
    const defaultCategories = [
      { name: 'Musician payments', description: null },
      { name: 'Musician reimbursements', description: null },
      { name: 'Sheet music printing', description: null },
      { name: 'Advertising costs', description: null },
      { name: 'Day-to-day management', description: null },
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
  }
}
