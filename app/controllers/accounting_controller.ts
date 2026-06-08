import { HttpContext } from '@adonisjs/core/http'
import AccountingEntry from '#models/accounting_entry'
import AccountingSettings from '#models/accounting_settings'
import AccountingCategory from '#models/accounting_category'
import Project from '#models/project'
import Contact from '#models/contact'
import ProjectPolicy from '#policies/project_policy'
import { DateTime } from 'luxon'
import { simpleFilter } from 'adonisjs-filters'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import path from 'path'
import fs from 'fs'

export default class AccountingController {

  // Utilitaire pour valider le format de l'ID
  private validateProjectId(projectId: string | undefined): number {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      throw new Error('Project ID is required and must be valid')
    }
    const numericId = Number(projectId)
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid project ID')
    }
    return numericId
  }

  // Helper centralisé pour sécuriser l'accès au projet (Phase 2)
  private async getAuthorizedProject({ bouncer, params }: HttpContext, action: 'view' | 'update' | 'delete' = 'view'): Promise<Project> {
    const projectId = this.validateProjectId(params.id)
    const project = await Project.findOrFail(projectId)

    // Le déstructuring permet à TS de valider la méthode with()
    await bouncer.with(ProjectPolicy).authorize(action, project)

    return project
  }

  async getSettings(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'view')
      const settings = await AccountingSettings.getOrCreateForProject(project.id)
      return ctx.response.json(settings.serialize())
    } catch (error) {
      console.error('Error getting accounting settings:', error)
      return ctx.response.status(400).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to retrieve accounting settings',
      })
    }
  }

  async updateSettings(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'update')
      const requestBody = ctx.request.body()

      if (!requestBody || typeof requestBody !== 'object') {
        return ctx.response.status(400).json({ error: 'Invalid request body format' })
      }

      let settings = await AccountingSettings.query().where('project_id', project.id).first()

      const validatedData = {
        currency: requestBody.currency || 'EUR',
        auto_overdue_enabled: Boolean(requestBody.auto_overdue_enabled),
        default_payment_terms: Number(requestBody.default_payment_terms) || 30,
        tax_rate: Number(requestBody.tax_rate) || 20.0,
        enable_tax: Boolean(requestBody.enable_tax),
        fiscal_year_start: requestBody.fiscal_year_start ? DateTime.fromISO(requestBody.fiscal_year_start) : null,
      }

      if (!settings) {
        settings = await AccountingSettings.create({
          project_id: project.id,
          ...validatedData,
        })
      } else {
        Object.assign(settings, validatedData)
        await settings.save()
      }

      if (validatedData.auto_overdue_enabled) {
        await AccountingEntry.updateOverdueStatuses(project.id)
      }

      return ctx.response.json(settings.serialize())
    } catch (error) {
      console.error('Error updating settings:', error)
      return ctx.response.status(400).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to update accounting settings',
      })
    }
  }

  async getAll(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'view')

      const baseQuery = AccountingEntry.query()
        .where('project_id', project.id) // Sécurité IDOR
        .preload('contact')
        .preload('category')
        .orderBy('created_at', 'desc')

      const result = await simpleFilter(
        ctx,
        baseQuery,
        ['name', 'description', 'payment_status', 'entry_type', 'invoice_number', 'notes'],
        [
          { relationColumns: ['first_name', 'last_name'] as any, relationName: 'contact' },
          { relationColumns: ['name'] as any, relationName: 'category' },
        ]
      )

      if (result && 'data' in result && result.data && Array.isArray(result.data)) {
        result.data = result.data.map((entry: any) => ({
          ...entry,
          name: entry.name || '',
          amount: Number(entry.amount),
        }))
      }

      return result
    } catch (error) {
      return ctx.response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async getStats(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'view')

      const stats = await AccountingEntry.getProjectStats(project.id)
      const statusResults = await AccountingEntry.query()
        .where('project_id', project.id) // Sécurité IDOR
        .select('payment_status')
        .count('* as total')
        .groupBy('payment_status')

      const byStatus = statusResults.map((result) => ({
        status: result.payment_status,
        count: Number(result.$extras.total || 0),
      }))

      return ctx.response.json({ ...stats, by_status: byStatus })
    } catch (error) {
      return ctx.response.status(400).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to get accounting stats',
      })
    }
  }

  async createOrUpdate(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'update')
      const requestBody = ctx.request.body()

      const id = requestBody.id ? Number(requestBody.id) : undefined
      const name = requestBody.name?.trim()
      const amount = Number(requestBody.amount)

      if (!name) return ctx.response.status(400).json({ error: 'Le nom est requis' })
      if (isNaN(amount) || amount === 0) return ctx.response.status(400).json({ error: 'Le montant ne peut pas être zéro' })

      const entryData = {
        name,
        description: requestBody.description?.trim() || null,
        amount,
        entry_type: requestBody.entry_type || 'expense',
        payment_status: requestBody.payment_status || 'pending',
        bill_date: requestBody.bill_date ? DateTime.fromISO(requestBody.bill_date) : null,
        payment_date: requestBody.payment_date ? DateTime.fromISO(requestBody.payment_date) : null,
        due_date: requestBody.due_date ? DateTime.fromISO(requestBody.due_date) : null,
        category_id: requestBody.category_id ? Number(requestBody.category_id) : null,
        contact_id: requestBody.contact_id ? Number(requestBody.contact_id) : null,
        attachment: requestBody.attachment?.trim() || null,
        is_individual_payment: Boolean(requestBody.is_individual_payment),
        is_musician_fee: Boolean(requestBody.is_musician_fee),
        invoice_number: requestBody.invoice_number?.trim() || null,
        notes: requestBody.notes?.trim() || null,
      }

      let entry: AccountingEntry

      if (id) {
        const existingEntry = await AccountingEntry.query()
          .where('id', id)
          .where('project_id', project.id) // Sécurité IDOR
          .first()

        if (!existingEntry) return ctx.response.status(404).json({ error: 'Entry not found' })

        Object.assign(existingEntry, entryData)
        await existingEntry.save()
        entry = existingEntry
      } else {
        entry = await AccountingEntry.create({
          project_id: project.id,
          ...entryData
        })
      }

      await Promise.all([
        entry.category_id ? entry.load('category') : Promise.resolve(),
        entry.contact_id ? entry.load('contact') : Promise.resolve()
      ])

      return ctx.response.json(entry.serialize())
    } catch (error) {
      console.error('Error creating/updating accounting entry:', error)
      return ctx.response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async delete(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'delete')
      const entryId = this.validateProjectId(ctx.params.accountingId)

      const entry = await AccountingEntry.query()
        .where('id', entryId)
        .where('project_id', project.id) // Sécurité IDOR
        .first()

      if (!entry) return ctx.response.status(404).json({ error: 'Entry not found' })

      await entry.delete()
      return ctx.response.json({ message: 'Accounting entry deleted' })
    } catch (error) {
      return ctx.response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async updateStatus(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'update')
      const entryId = this.validateProjectId(ctx.params.entryId)
      const requestBody = ctx.request.body()

      const entry = await AccountingEntry.query()
        .where('id', entryId)
        .where('project_id', project.id) // Sécurité IDOR
        .first()

      if (!entry) return ctx.response.status(404).json({ error: 'Entry not found' })

      const data = {
        payment_status: requestBody.payment_status,
        payment_date: requestBody.payment_date ? DateTime.fromISO(requestBody.payment_date) : null,
        notes: requestBody.notes?.trim() || null,
      }

      if (data.payment_status === 'paid' && !entry.payment_date) {
        data.payment_date = DateTime.now()
      }

      Object.assign(entry, data)
      await entry.save()

      await Promise.all([
        entry.category_id ? entry.load('category') : Promise.resolve(),
        entry.contact_id ? entry.load('contact') : Promise.resolve()
      ])

      return ctx.response.json(entry.serialize())
    } catch (error) {
      return ctx.response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  // --- Categories Management (Sécurisé avec adminRights) ---

  async getCategories({ response }: HttpContext) {
    try {
      const categories = await AccountingCategory.query().orderBy('name', 'asc')
      return response.json(categories.map((cat) => cat.serialize()))
    } catch (error) {
      return response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async createOrUpdateCategory({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights') // Sécurité

    try {
      const requestBody = request.body()
      const name = requestBody.name?.trim()
      const id = requestBody.id ? Number(requestBody.id) : undefined

      if (!name) return response.status(400).json({ error: 'Le nom de la catégorie est requis' })

      const categoryData = {
        name,
        description: requestBody.description?.trim() || null,
        is_default: Boolean(requestBody.is_default),
        color: requestBody.color?.trim() || null,
        icon: requestBody.icon?.trim() || null,
      }

      let category: AccountingCategory

      if (id) {
        const existingCategory = await AccountingCategory.find(id)
        if (!existingCategory) return response.status(404).json({ error: 'Category not found' })

        Object.assign(existingCategory, categoryData)
        await existingCategory.save()
        category = existingCategory
      } else {
        category = await AccountingCategory.create(categoryData)
      }

      return response.json(category.serialize())
    } catch (error) {
      return response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  async deleteCategory({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights') // Sécurité

    try {
      const categoryId = Number(params.categoryId)
      if (isNaN(categoryId)) return response.status(400).json({ error: 'Invalid category ID' })

      const category = await AccountingCategory.find(categoryId)
      if (!category) return response.status(404).json({ error: 'Category not found' })

      const usedCount = await AccountingEntry.query().where('category_id', categoryId).count('* as total')
      if (Number(usedCount[0].$extras.total) > 0) {
        return response.status(400).json({ error: 'Cannot delete category that is in use' })
      }

      await category.delete()
      return response.json({ message: 'Category deleted' })
    } catch (error) {
      return response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  // --- Attachment Management ---

  async uploadAttachment({ request, response }: HttpContext) {
    try {
      const file = request.file('file', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt'],
      })

      if (!file) return response.badRequest({ error: 'No file uploaded' })

      const fileName = `${cuid()}.${file.extname}`
      const targetDir = app.makePath('uploads/accountingsAttachments')

      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

      await file.move(targetDir, { name: fileName })

      return response.ok({
        fileName,
        path: path.join('uploads/accountingsAttachments', fileName),
      })
    } catch (error) {
      console.error('Error in uploadAttachment:', error)
      return response.internalServerError({
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async downloadAttachment({ params, response }: HttpContext) {
    try {
      const filename = params.filename
      if (!filename) return response.status(400).json({ error: 'Filename is required' })

      const filePath = path.join(process.cwd(), 'uploads/accountingsAttachments', filename)
      if (!fs.existsSync(filePath)) return response.status(404).json({ error: 'File not found' })

      return response.download(filePath, filename)
    } catch (error) {
      console.error('Error in downloadAttachment:', error)
      return response.status(500).json({
        error: 'Failed to download attachment',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // --- Legacy compatibility methods ---

  async getContactAccountings({ params, response }: HttpContext) {
    try {
      const contactId = Number(params.contactId)
      if (isNaN(contactId)) return response.status(400).json({ error: 'Invalid contact ID' })

      const data = await AccountingEntry.query()
        .where('contact_id', contactId)
        .preload('category')
        .orderBy('id', 'desc')

      return response.ok(data.map((entry) => entry.serialize()))
    } catch (error) {
      console.error('Error in getContactAccountings:', error)
      return response.status(500).json({
        error: 'Failed to fetch contact accountings',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  async getContactAccountingsproject(ctx: HttpContext) {
    try {
      const project = await this.getAuthorizedProject(ctx, 'view')

      const data = await AccountingEntry.query()
        .where('project_id', project.id) // Sécurité IDOR
        .whereNotNull('contact_id')
        .preload('contact')
        .preload('category')
        .orderBy('id', 'desc')

      return ctx.response.ok(data.map((entry) => entry.serialize()))
    } catch (error) {
      console.error('Error in getContactAccountingsproject:', error)
      return ctx.response.status(500).json({
        error: 'Failed to fetch contact accountings',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
