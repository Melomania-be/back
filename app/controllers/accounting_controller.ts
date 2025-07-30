import Accounting from '#models/accounting'
import { createAccountingValidator } from '#validators/accounting'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import path, { join } from 'path'
import fs, { createReadStream } from 'fs'
import * as fss from 'node:fs/promises' 
import { extname } from 'node:path'


export default class AccountingsController {
  async getAll(ctx: HttpContext) {
    const data = await Accounting.query()
      .where('project_id', ctx.params.id)

    return data
  }

  async createOrUpdate({ request, response }: HttpContext) {
    const data = await request.validateUsing(createAccountingValidator)

    let accounting: Accounting | null = null

    if (data.id) {
      accounting = await Accounting.find(data.id)
      if (!accounting) return response.abort('Accounting record not found')

      accounting.merge({
        name: data.name,
        amount: data.amount,
        bill_date: data.bill_date ? DateTime.fromJSDate(new Date(data.bill_date)) : null,
        payment_date: data.payment_date ? DateTime.fromJSDate(new Date(data.payment_date)) : null,
        category_id: data.category_id,
        contact_id: data.contact_id,
        project_id: data.project.id,
        attachment: data.attachment,
        is_individual_payment : data.is_individual_payment,
        is_musician_fee : data.is_musician_fee,
      })

      await accounting.save()
    } else {
      accounting = await Accounting.create({
        name: data.name,
        amount: data.amount,
        bill_date: data.bill_date ? DateTime.fromJSDate(new Date(data.bill_date)) : null,
        payment_date: data.payment_date ? DateTime.fromJSDate(new Date(data.payment_date)) : null,
        category_id: data.category_id,
        contact_id: data.contact_id,
        project_id: data.project.id,
        attachment: data.attachment,
        is_individual_payment : data.is_individual_payment,
        is_musician_fee : data.is_musician_fee,
      })
    }

    return response.ok(accounting)
  }

  async delete({ params, response }: HttpContext) {
      const id = Number(params.id)
      const accountingId = Number(params.accountingId)
      const accounting = await Accounting.query()
        .where('id', accountingId)
        .andWhere('project_id', id)
        .first()
  
      if (!accounting) {
        return response.send("Can't find this accounting in this project")
      }
  
      await accounting.delete()
      return response.send('Accounting deleted from the project')
    }

  async getContactAccountingsproject(ctx : HttpContext){
    const ProjectId = Number(ctx.params.id)
    const data = await Accounting.query()
      .where('project_id' , ProjectId)
      .whereNotNull('contact_id')

    return data
  }

  async getContactAccountings(ctx : HttpContext){
    const ContactId = Number(ctx.params.contactId)
    const data = await Accounting.query()
      .where('contact_id' , ContactId) 

    return data
  }

  public async uploadAttachment({ request, response }: HttpContext) {
    const file = request.file('file', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'pdf'],
    })

    if (!file) {
      return response.badRequest({ error: 'No file uploaded' })
    }

    const fileName = `${cuid()}.${file.extname}`
    const targetDir = app.makePath('uploads/accountingsAttachments')

    try {
      await file.move(targetDir, {
        name: fileName,
      })

      return response.ok({
        fileName,
        path: path.join('uploads/accountingsAttachments', fileName),
      })
    } catch (error) {
      return response.internalServerError({
        error: 'Failed to upload file',
        details: (error as Error).message,
      })
    }
  }

  public async downloadAttachment({ params, response } : HttpContext) {
    const filename = params.filename
    // process.cwd() donne la racine du projet, peu importe le framework
    const filePath = path.join(process.cwd(), 'uploads/accountingsAttachments', filename)

    if (!fs.existsSync(filePath)) {
      return response.status(404).send('Fichier introuvable')
    }

    return response.download(filePath, filename)
  }
}
