import { HttpContext } from '@adonisjs/core/http'
import AccountingEntry from '#models/accounting_entry'
import AccountingSettings from '#models/accounting_settings'
import AccountingCategory from '#models/accounting_category'
import Project from '#models/project'
import Contact from '#models/contact'
import { DateTime } from 'luxon'
import { simpleFilter } from 'adonisjs-filters'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import path from 'path'
import fs from 'fs'

export default class AccountingController {
  private validateProjectId(projectId: string | undefined): number {
    if (!projectId) {
      throw new Error('Project ID is required')
    }

    if (projectId === 'undefined' || projectId === 'null') {
      throw new Error('Invalid project ID format')
    }

    const numericId = Number(projectId)
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error('Invalid project ID')
    }

    return numericId
  }

  async getSettings({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      const settings = await AccountingSettings.getOrCreateForProject(projectId)

      return response.json(settings.serialize())
    } catch (error) {
      console.error('Error getting accounting settings:', error)
      return response.status(400).json({
        error: error.message,
        details: 'Failed to retrieve accounting settings',
      })
    }
  }

  async updateSettings({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const requestBody = request.body()

      if (!requestBody || typeof requestBody !== 'object') {
        return response.status(400).json({
          error: 'Invalid request body format',
        })
      }

      const project = await Project.find(projectId)
      if (!project) {
        return response.status(404).json({ error: 'Project not found' })
      }

      let settings = await AccountingSettings.query().where('project_id', projectId).first()

      const validatedData = {
        currency: requestBody.currency || 'EUR',
        auto_overdue_enabled: Boolean(requestBody.auto_overdue_enabled),
        default_payment_terms: Number(requestBody.default_payment_terms) || 30,
        tax_rate: Number(requestBody.tax_rate) || 20.0,
        enable_tax: Boolean(requestBody.enable_tax),
        fiscal_year_start: requestBody.fiscal_year_start
          ? DateTime.fromISO(requestBody.fiscal_year_start)
          : null,
      }

      if (!settings) {
        settings = await AccountingSettings.create({
          project_id: projectId,
          ...validatedData,
        })
      } else {
        Object.assign(settings, validatedData)
        await settings.save()
      }

      if (validatedData.auto_overdue_enabled) {
        await AccountingEntry.updateOverdueStatuses(projectId)
      }

      return response.json(settings.serialize())
    } catch (error) {
      console.error('Error updating settings:', error)
      return response.status(400).json({
        error: error.message,
        details: 'Failed to update accounting settings',
      })
    }
  }

  async getAll(ctx: HttpContext) {
    try {
      const projectId = this.validateProjectId(ctx.params.id)

      const baseQuery = AccountingEntry.query()
        .where('project_id', projectId)
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
      return ctx.response.status(400).json({ error: error.message })
    }
  }

  async getStats({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)

      const stats = await AccountingEntry.getProjectStats(projectId)

      const statusResults = await AccountingEntry.query()
        .where('project_id', projectId)
        .select('payment_status')
        .count('* as total')
        .groupBy('payment_status')

      const byStatus = statusResults.map((result) => ({
        status: result.payment_status,
        count: Number(result.$extras.total || 0),
      }))

      return response.json({
        ...stats,
        by_status: byStatus,
      })
    } catch (error) {
      return response.status(400).json({
        error: error.message,
        details: 'Failed to get accounting stats',
      })
    }
  }

  async createOrUpdate({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const requestBody = request.body()

      const id = requestBody.id ? Number(requestBody.id) : undefined
      const name = requestBody.name?.trim()
      const description = requestBody.description?.trim() || null
      const amount = Number(requestBody.amount)
      const entry_type = requestBody.entry_type || 'expense'
      const payment_status = requestBody.payment_status || 'pending'
      const bill_date = requestBody.bill_date ? DateTime.fromISO(requestBody.bill_date) : null
      const payment_date = requestBody.payment_date
        ? DateTime.fromISO(requestBody.payment_date)
        : null
      const due_date = requestBody.due_date ? DateTime.fromISO(requestBody.due_date) : null
      const category_id = requestBody.category_id ? Number(requestBody.category_id) : null
      const contact_id = requestBody.contact_id ? Number(requestBody.contact_id) : null
      const contractor_contact_id =
  requestBody.contractor_contact_id
    ? Number(requestBody.contractor_contact_id)
    : null
      const attachment = requestBody.attachment?.trim() || null
      const is_individual_payment = Boolean(requestBody.is_individual_payment)
      const is_musician_fee = Boolean(requestBody.is_musician_fee)
      const invoice_number = requestBody.invoice_number?.trim() || null
      const notes = requestBody.notes?.trim() || null

      if (!name) {
        return response.status(400).json({
          error: 'Le nom est requis',
        })
      }

      if (isNaN(amount) || amount === 0) {
        return response.status(400).json({
          error: 'Le montant ne peut pas être zéro',
        })
      }

      let entry: AccountingEntry

      if (id) {
        const existingEntry = await AccountingEntry.query()
          .where('id', id)
          .where('project_id', projectId)
          .first()

        if (!existingEntry) {
          return response.status(404).json({ error: 'Entry not found' })
        }

        existingEntry.name = name
        existingEntry.description = description
        existingEntry.amount = amount
        existingEntry.entry_type = entry_type
        existingEntry.payment_status = payment_status
        existingEntry.bill_date = bill_date
        existingEntry.payment_date = payment_date
        existingEntry.due_date = due_date
        existingEntry.category_id = category_id
        existingEntry.contact_id = contact_id
        existingEntry.contractor_contact_id = contractor_contact_id
        existingEntry.attachment = attachment
        existingEntry.is_individual_payment = is_individual_payment
        existingEntry.is_musician_fee = is_musician_fee
        existingEntry.invoice_number = invoice_number
        existingEntry.notes = notes
        await existingEntry.save()
        entry = existingEntry
      } else {
        entry = await AccountingEntry.create({
          project_id: projectId,
          name,
          description,
          amount,
          entry_type,
          payment_status,
          bill_date,
          payment_date,
          due_date,
          category_id,
          contact_id,
          contractor_contact_id,
          attachment,
          is_individual_payment,
          is_musician_fee,
          invoice_number,
          notes,
        })
      }

      const loadPromises = []

      if (entry.category_id) {
        loadPromises.push(entry.load('category'))
      }

      if (entry.contact_id) {
        loadPromises.push(entry.load('contact'))
      }

      if (entry.contractor_contact_id) {
    loadPromises.push(entry.load('contractor'))
}

      await Promise.all(loadPromises)

      return response.json(entry.serialize())
    } catch (error) {
      console.error('Error creating/updating accounting entry:', error)
      return response.status(400).json({ error: error.message })
    }
  }

  async delete({ params, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const entryId = this.validateProjectId(params.accountingId)

      const entry = await AccountingEntry.query()
        .where('id', entryId)
        .where('project_id', projectId)
        .first()

      if (!entry) {
        return response.status(404).json({ error: 'Entry not found' })
      }

      await entry.delete()
      return response.json({ message: 'Accounting entry deleted' })
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async updateStatus({ params, request, response }: HttpContext) {
    try {
      const projectId = this.validateProjectId(params.id)
      const entryId = this.validateProjectId(params.entryId)
      const requestBody = request.body()

      const entry = await AccountingEntry.query()
        .where('id', entryId)
        .where('project_id', projectId)
        .first()

      if (!entry) {
        return response.status(404).json({ error: 'Entry not found' })
      }

      const data = {
        payment_status: requestBody.payment_status,
        payment_date: requestBody.payment_date
          ? DateTime.fromISO(requestBody.payment_date)
          : null,
        notes: requestBody.notes?.trim() || null,
      }

      if (data.payment_status === 'paid' && !entry.payment_date) {
        data.payment_date = DateTime.now()
      }

      Object.assign(entry, data)
      await entry.save()

      const loadPromises = []

      if (entry.category_id) {
        loadPromises.push(entry.load('category'))
      }

      if (entry.contact_id) {
        loadPromises.push(entry.load('contact'))
      }

      if (entry.contractor_contact_id) {
    loadPromises.push(entry.load('contractor'))
}

      await Promise.all(loadPromises)

      return response.json(entry.serialize())
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Categories Management
  async getCategories({ response }: HttpContext) {
    try {
      const categories = await AccountingCategory.query().orderBy('name', 'asc')
      return response.json(categories.map((cat) => cat.serialize()))
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  async createOrUpdateCategory({ request, response }: HttpContext) {
    try {
      const requestBody = request.body()

      const id = requestBody.id ? Number(requestBody.id) : undefined
      const name = requestBody.name?.trim()
      const description = requestBody.description?.trim() || null
      const is_default = Boolean(requestBody.is_default)
      const color = requestBody.color?.trim() || null
      const icon = requestBody.icon?.trim() || null

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
      return response.status(400).json({ error: error.message })
    }
  }

  async deleteCategory({ params, response }: HttpContext) {
    try {
      const categoryId = Number(params.categoryId)

      if (isNaN(categoryId)) {
        return response.status(400).json({ error: 'Invalid category ID' })
      }

      const category = await AccountingCategory.find(categoryId)

      if (!category) {
        return response.status(404).json({ error: 'Category not found' })
      }

      // Check if category is used by any entry
      const usedCount = await AccountingEntry.query().where('category_id', categoryId).count('* as total')

      if (Number(usedCount[0].$extras.total) > 0) {
        return response.status(400).json({
          error: 'Cannot delete category that is in use',
        })
      }

      await category.delete()
      return response.json({ message: 'Category deleted' })
    } catch (error) {
      return response.status(400).json({ error: error.message })
    }
  }

  // Attachment Management
  async uploadAttachment({ request, response }: HttpContext) {
    try {
      const file = request.file('file', {
        size: '10mb',
        extnames: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt'],
      })

      if (!file) {
        return response.badRequest({ error: 'No file uploaded' })
      }

      const fileName = `${cuid()}.${file.extname}`
      const targetDir = app.makePath('uploads/accountingsAttachments')

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      await file.move(targetDir, {
        name: fileName,
      })

      return response.ok({
        fileName,
        path: path.join('uploads/accountingsAttachments', fileName),
      })
    } catch (error) {
      console.error('Error in uploadAttachment:', error)
      return response.internalServerError({
        error: 'Failed to upload file',
        details: (error as Error).message,
      })
    }
  }

  async downloadAttachment({ params, response }: HttpContext) {
    try {
      const filename = params.filename

      if (!filename) {
        return response.status(400).json({ error: 'Filename is required' })
      }

      const filePath = path.join(process.cwd(), 'uploads/accountingsAttachments', filename)

      if (!fs.existsSync(filePath)) {
        return response.status(404).json({ error: 'File not found' })
      }

      return response.download(filePath, filename)
    } catch (error) {
      console.error('Error in downloadAttachment:', error)
      return response.status(500).json({
        error: 'Failed to download attachment',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Legacy compatibility methods
  async getContactAccountings({ params, response }: HttpContext) {
    try {
      const contactId = Number(params.contactId)

      if (isNaN(contactId)) {
        return response.status(400).json({ error: 'Invalid contact ID' })
      }

      const data = await AccountingEntry.query()
        .where('contact_id', contactId)
        .preload('category')
        .orderBy('id', 'desc')

      const serializedData = data.map((entry) => entry.serialize())
      return response.ok(serializedData)
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
      const projectId = this.validateProjectId(ctx.params.id)

      const data = await AccountingEntry.query()
        .where('project_id', projectId)
        .whereNotNull('contact_id')
        .preload('contact')
        .preload('category')
        .orderBy('id', 'desc')

      const serializedData = data.map((entry) => entry.serialize())
      return ctx.response.ok(serializedData)
    } catch (error) {
      console.error('Error in getContactAccountingsproject:', error)
      return ctx.response.status(500).json({
        error: 'Failed to fetch contact accountings',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
