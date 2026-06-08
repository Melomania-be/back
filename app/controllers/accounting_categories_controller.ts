import { HttpContext } from '@adonisjs/core/http'
import AccountingCategory from '#models/accounting_category'
import AccountingEntry from '#models/accounting_entry'

export default class AccountingCategoriesController {

  async getAll({ response }: HttpContext) {
    try {
      const categories = await AccountingCategory.query().orderBy('name', 'asc')
      return response.json(categories.map((cat) => cat.serialize()))
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async createOrUpdate({ request, response, bouncer }: HttpContext) {
    // SÉCURITÉ : Action réservée aux administrateurs
    await bouncer.authorize('adminRights')

    try {
      const { id, name, description, is_default, color, icon } = request.only([
        'id', 'name', 'description', 'is_default', 'color', 'icon'
      ])

      if (!name?.trim()) {
        return response.status(400).json({ error: 'Le nom de la catégorie est requis' })
      }

      let category: AccountingCategory

      if (id) {
        category = await AccountingCategory.findOrFail(id)
        category.merge({
          name: name.trim(),
          description: description?.trim() || null,
          is_default: Boolean(is_default),
          color: color?.trim() || null,
          icon: icon?.trim() || null,
        })
        await category.save()
      } else {
        category = await AccountingCategory.create({
          name: name.trim(),
          description: description?.trim() || null,
          is_default: Boolean(is_default),
          color: color?.trim() || null,
          icon: icon?.trim() || null,
        })
      }

      return response.json(category.serialize())
    } catch (error) {
      return response.status(400).json({
        error: 'Failed to create or update category',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async delete({ params, response, bouncer }: HttpContext) {
    // SÉCURITÉ : Action réservée aux administrateurs
    await bouncer.authorize('adminRights')

    try {
      const categoryId = Number(params.id)
      const category = await AccountingCategory.findOrFail(categoryId)

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
      return response.status(500).json({
        error: 'Failed to delete category',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
