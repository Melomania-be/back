import { HttpContext } from '@adonisjs/core/http'
import AccountingCategory from '#models/accounting_category'
import AccountingEntry from '#models/accounting_entry'

export default class AccountingCategoriesController {
  async getAll({ response }: HttpContext) {
    try {
      const categories
        = await AccountingCategory.query().orderBy('name', 'asc')
      return response.json(categories.map((cat) => cat.serialize()))
    } catch (error) {
      console.error('Error in getAll categories:', error)
      return response.status(500).json({
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async createOrUpdate({ request, response }: HttpContext) {
    try {
      const requestBody = request.body()

      const name = requestBody.name?.trim()
      const description = requestBody.description?.trim() || null
      const is_default = Boolean(requestBody.is_default)
      const color = requestBody.color?.trim() || null
      const icon = requestBody.icon?.trim() || null
      const id = requestBody.id ? Number(requestBody.id) : undefined

      if (!name) {
        return response.status(400).json({
          error: 'Le nom de la catégorie est requis',
        })
      }

      let category: AccountingCategory

      if (id) {
        const existingCategory = await AccountingCategory.find(id)

        if (!existingCategory) {
          return response.status(404).json({ error: 'Category not found' })
        }

        existingCategory.name = name
        existingCategory.description = description
        existingCategory.is_default = is_default
        existingCategory.color = color
        existingCategory.icon = icon
        await existingCategory.save()
        category = existingCategory
      } else {
        category = await AccountingCategory.create({
          name,
          description,
          is_default,
          color,
          icon,
        })
      }

      return response.json(category.serialize())
    } catch (error) {
      console.error('Error in createOrUpdate category:', error)
      return response.status(400).json({
        error: 'Failed to create or update category',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async delete({ params, response }: HttpContext) {
    try {
      const categoryId = Number(params.id)

      if (isNaN(categoryId)) {
        return response.status(400).json({ error: 'Invalid category ID' })
      }

      const category = await AccountingCategory.find(categoryId)

      if (!category) {
        return response.status(404).json({ error: 'Category not found' })
      }

      // Check if category is used by any entry
      const usedCount = await AccountingEntry.query()
        .where('category_id', categoryId)
        .count('* as total')

      if (Number(usedCount[0].$extras.total) > 0) {
        return response.status(400).json({
          error: 'Cannot delete category that is in use by accounting entries',
        })
      }

      await category.delete()
      return response.json({ message: 'Category deleted successfully' })
    } catch (error) {
      console.error('Error in delete category:', error)
      return response.status(500).json({
        error: 'Failed to delete category',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
