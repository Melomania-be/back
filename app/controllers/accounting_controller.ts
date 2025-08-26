import Accounting from '#models/accounting'
import { createAccountingValidator } from '#validators/accounting'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import path from 'path'
import fs from 'fs'

export default class AccountingsController {
  async getAll(ctx: HttpContext) {
    try {
      const projectId = Number(ctx.params.id)

      if (isNaN(projectId)) {
        return ctx.response.status(400).json({ error: 'Invalid project ID' })
      }

      const data = await Accounting.query()
        .where('project_id', projectId)
        .orderBy('id', 'desc')

      // Sérialiser les données pour s'assurer que les dates sont formatées correctement
      const serializedData = data.map(accounting => accounting.serialize())

      return ctx.response.ok(serializedData)
    } catch (error) {
      console.error('Error in getAll accounting:', error)
      return ctx.response.status(500).json({
        error: 'Failed to fetch accountings',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async createOrUpdate({ request, response, params }: HttpContext) {
    try {
      const data = await request.validateUsing(createAccountingValidator)
      const projectId = Number(params.id)

      if (isNaN(projectId)) {
        return response.status(400).json({ error: 'Invalid project ID' })
      }

      let accounting: Accounting | null = null

      if (data.id) {
        accounting = await Accounting.find(data.id)
        if (!accounting) {
          return response.status(404).json({ error: 'Accounting record not found' })
        }

        accounting.merge({
          name: data.name,
          amount: data.amount,
          bill_date: data.bill_date ? DateTime.fromJSDate(new Date(data.bill_date)) : null,
          payment_date: data.payment_date ? DateTime.fromJSDate(new Date(data.payment_date)) : null,
          category_id: data.category_id || null,
          contact_id: data.contact_id || null,
          project_id: data.project?.id || projectId,
          attachment: data.attachment || null,
          is_individual_payment: data.is_individual_payment || false,
          is_musician_fee: data.is_musician_fee || false,
        })

        await accounting.save()
      } else {
        accounting = await Accounting.create({
          name: data.name,
          amount: data.amount,
          bill_date: data.bill_date ? DateTime.fromJSDate(new Date(data.bill_date)) : null,
          payment_date: data.payment_date ? DateTime.fromJSDate(new Date(data.payment_date)) : null,
          category_id: data.category_id || null,
          contact_id: data.contact_id || null,
          project_id: data.project?.id || projectId,
          attachment: data.attachment || null,
          is_individual_payment: data.is_individual_payment || false,
          is_musician_fee: data.is_musician_fee || false,
        })
      }

      return response.ok(accounting.serialize())
    } catch (error) {
      console.error('Error in createOrUpdate accounting:', error)

      // Gestion plus précise des erreurs de validation
      if (error.messages) {
        return response.status(422).json({
          error: 'Validation failed',
          messages: error.messages
        })
      }

      return response.status(500).json({
        error: 'Failed to create or update accounting',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async delete({ params, response }: HttpContext) {
    try {
      const projectId = Number(params.id)
      const accountingId = Number(params.accountingId)

      if (isNaN(projectId) || isNaN(accountingId)) {
        return response.status(400).json({ error: 'Invalid parameters' })
      }

      const accounting = await Accounting.query()
        .where('id', accountingId)
        .andWhere('project_id', projectId)
        .first()

      if (!accounting) {
        return response.status(404).json({ error: "Can't find this accounting in this project" })
      }

      await accounting.delete()
      return response.ok({ message: 'Accounting deleted from the project' })
    } catch (error) {
      console.error('Error in delete accounting:', error)
      return response.status(500).json({
        error: 'Failed to delete accounting',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async getContactAccountingsproject(ctx: HttpContext) {
    try {
      const projectId = Number(ctx.params.id)

      if (isNaN(projectId)) {
        return ctx.response.status(400).json({ error: 'Invalid project ID' })
      }

      const data = await Accounting.query()
        .where('project_id', projectId)
        .whereNotNull('contact_id')
        .orderBy('id', 'desc')

      const serializedData = data.map(accounting => accounting.serialize())
      return ctx.response.ok(serializedData)
    } catch (error) {
      console.error('Error in getContactAccountingsproject:', error)
      return ctx.response.status(500).json({
        error: 'Failed to fetch contact accountings',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  async getContactAccountings(ctx: HttpContext) {
    try {
      const contactId = Number(ctx.params.contactId)

      if (isNaN(contactId)) {
        return ctx.response.status(400).json({ error: 'Invalid contact ID' })
      }

      const data = await Accounting.query()
        .where('contact_id', contactId)
        .orderBy('id', 'desc')

      const serializedData = data.map(accounting => accounting.serialize())
      return ctx.response.ok(serializedData)
    } catch (error) {
      console.error('Error in getContactAccountings:', error)
      return ctx.response.status(500).json({
        error: 'Failed to fetch contact accountings',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  public async uploadAttachment({ request, response }: HttpContext) {
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

      // Ensure directory exists
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

  public async downloadAttachment({ params, response }: HttpContext) {
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
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
