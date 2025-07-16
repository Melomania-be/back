import ExpenseCategory from '#models/expense_category'
import {  } from '#validators/accounting'
import { createExpenseCategoryValidator } from '#validators/expense_categories'
import { HttpContext } from '@adonisjs/core/http'

export default class ExpenseCategoriesController {
  async getAll() {
    const data = await ExpenseCategory.query()

    return data
  }

  async createOrUpdate({ request, response }: HttpContext) {
    const data = await request.validateUsing(createExpenseCategoryValidator)

    let expense_categories: ExpenseCategory | null = null

    if (data.id) {
      expense_categories = await ExpenseCategory.find(data.id)
      if (!expense_categories) return response.abort('Category not found')

      expense_categories.merge({
        name: data.name,
        description: data.description,
        isDefault: false,
        color: data.color ? data.color : null
      })

      await expense_categories.save()
    } else {
      expense_categories = await ExpenseCategory.create({
        name: data.name,
        description: data.description,
        isDefault: false,
        color: data.color ? data.color : null
      })
    }

    return response.ok(expense_categories)
  }

  async delete({ params, response }: HttpContext) {
      const id = Number(params.id)
      const expense_categories = await ExpenseCategory.query()
        .where('id', id)
        .first()
  
      if (!expense_categories) {
        return response.send("Can't find this category")
      }
  
      await expense_categories.delete()
      return response.send('Category deleted')
    }
}
