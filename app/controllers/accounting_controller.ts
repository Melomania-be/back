import Accounting from '#models/accounting'
import { createAccountingValidator } from '#validators/accounting'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

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
}
