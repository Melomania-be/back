import ExpenseCategory from '#models/expense_category'
import { createExpenseCategoryValidator } from '#validators/expense_categories'
import { HttpContext } from '@adonisjs/core/http'

export default class ExpenseCategoriesController {

  async getAll({ response }: HttpContext) {
    // Lecture publique ou authentifiée simple
    try {
      const data = await ExpenseCategory.query().orderBy('id', 'asc')
      return response.ok(data)
    } catch (error) {
      return response.status(500).json({ error: 'Failed to fetch expense categories' })
    }
  }

  async createOrUpdate({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')

    try {
      const data = await request.validateUsing(createExpenseCategoryValidator)
      let expense_categories: ExpenseCategory | null = null

      if (data.id) {
        expense_categories = await ExpenseCategory.find(data.id)
        if (!expense_categories) return response.status(404).json({ error: 'Category not found' })

        expense_categories.merge({
          name: data.name,
          description: data.description || null,
          isDefault: false,
          color: data.color || null
        })
        await expense_categories.save()
      } else {
        expense_categories = await ExpenseCategory.create({
          name: data.name,
          description: data.description || null,
          isDefault: false,
          color: data.color || null
        })
      }

      return response.ok(expense_categories)
    } catch (error) {
      return response.status(500).json({ error: 'Failed to create or update expense category' })
    }
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')

    try {
      const id = Number(params.id)
      if (isNaN(id)) return response.status(400).json({ error: 'Invalid category ID' })

      const expense_categories = await ExpenseCategory.query().where('id', id).first()
      if (!expense_categories) return response.status(404).json({ error: "Can't find this category" })
      if (expense_categories.isDefault) return response.status(400).json({ error: "Cannot delete default category" })

      await expense_categories.delete()
      return response.ok({ message: 'Category deleted' })
    } catch (error) {
      return response.status(500).json({ error: 'Failed to delete expense category' })
    }
  }
}