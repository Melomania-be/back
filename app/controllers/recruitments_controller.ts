// // import type { HttpContext } from '@adonisjs/core/http'
// import Recruitment from '#models/recruitment'
// import { simpleFilter, advancedFilter } from 'adonisjs-filters'
// import { createRecruitmentValidator, mergeRecruitmentsValidator } from '#validators/recruitment'
// import { HttpContext } from '@adonisjs/core/http'
// import { DateTime } from 'luxon'

// export default class RecruitmentController {
//   // Simple list with basic filtering on some columns

//   public async test({ response }: HttpContext) {
//     return response.ok({
//       success: true,
//       message: 'Recruitments test route working fine!',
//     })
//   }
//   async getAll(ctx: HttpContext) {
//     const baseQuery = Recruitment.query()

//     return await simpleFilter(
//       ctx,
//       baseQuery,
//       ['firstName', 'lastName', 'comment', 'status'], // basic filter columns
//       [] // no relation filtering here, but you can add if needed
//     )
//   }

//   // Get one recruitment by id with any relations if needed
//   async getOne({ params }: HttpContext) {
//     return await Recruitment.query().where('id', params.id).firstOrFail()
//   }

//   // Advanced search with more complex filtering (if needed)
//   async advancedSearch(ctx: HttpContext) {
//     const baseQuery = Recruitment.query()
//     const data = await advancedFilter(ctx, baseQuery)

//     return {
//       data,
//       columns: {
//         self: [
//           'id',
//           'firstName',
//           'lastName',
//           'contactDate',
//           'contactedBy',
//           'status',
//           'statusUpdatedAt',
//           'comment',
//         ],
//       },
//     }
//   }

//   // Merge two recruitments (example placeholder logic)
//   async mergeRecruitments(ctx: HttpContext) {
//     const data = await ctx.request.validateUsing(mergeRecruitmentsValidator)

//     if (!data.recruitmentId1 || !data.recruitmentId2) {
//       return ctx.response.status(400).send('No recruitment ids provided')
//     }
//     if (data.recruitmentId1 === data.recruitmentId2) {
//       return ctx.response.status(400).send('Cannot merge a recruitment with itself')
//     }

//     const rec1 = await Recruitment.findOrFail(data.recruitmentId1)
//     const rec2 = await Recruitment.findOrFail(data.recruitmentId2)

//     // Simple merge: override fields from rec2 if provided
//     rec1.firstName = data.firstName ?? rec1.firstName
//     rec1.lastName = data.lastName ?? rec1.lastName
//     rec1.contactDate = data.contactDate ?? rec1.contactDate
//     rec1.contactedBy = data.contactedBy !== undefined ? Number(data.contactedBy) : rec1.contactedBy
//     rec1.status = data.status ?? rec1.status
//     rec1.statusUpdatedAt = data.statusUpdatedAt ?? rec1.statusUpdatedAt
//     rec1.comment = data.comment ?? rec1.comment

//     await rec1.save()
//     await rec2.delete()

//     return rec1
//   }

//   // Create or update recruitment record
//   async createOrUpdate(ctx: HttpContext) {
//     const data = await ctx.request.validateUsing(createRecruitmentValidator)

//     if (!data.id) {
//       const created = await Recruitment.create(data)
//       return ctx.response.json({ message: 'Recruitment created', data: created })
//     }

//     const recruitment = await Recruitment.updateOrCreate({ id: data.id }, data)
//     return ctx.response.json({ message: 'Recruitment updated', data: recruitment })
//   }

//   // Delete recruitment by id
//   async delete({ params, response }: HttpContext) {
//     const recruitment = await Recruitment.find(params.id)
//     if (!recruitment) return response.status(404).json({ error: 'Recruitment not found' })

//     await recruitment.delete()
//     return response.json({ message: 'Recruitment deleted' })
//   }

//   // Just a create method if you want to separate it
//     async create(ctx: HttpContext) {
//       const data = await ctx.request.validateUsing(createRecruitmentValidator)

//       const existing = await Recruitment.query()
//         .where('firstName', data.firstName)
//         .andWhere('lastName', data.lastName)
//         .first()

//       if (existing) return ctx.response.send('Recruitment already exists.')

//       return await Recruitment.create(data)
//     }

// }

import { HttpContext } from '@adonisjs/core/http'
import Recruitment from '#models/recruitment'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import { createRecruitmentValidator, mergeRecruitmentsValidator } from '#validators/recruitment'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import SectionGroup from '#models/section_group'

export const checkStatusValidator = vine.compile(
  vine.object({
    checkDateTime: vine
      .string()
      .trim()
      .transform((value, field) => {
        const dateTime = DateTime.fromISO(value, { zone: 'utc' })
        if (!dateTime.isValid) {
          field.report(
            'The {{ field }} must be a valid ISO datetime string.',
            'invalid_datetime',
            field
          )
        }
        return dateTime
      }),
  })
)

export default class RecruitmentController {
  // Simple test route
  public async test({ response }: HttpContext) {
    return response.ok({
      success: true,
      message: 'Recruitments test route working fine!',
    })
  }

  // Get all recruitments with basic filtering
  async getAll(ctx: HttpContext) {
    const baseQuery = Recruitment.query()
      .preload('sectionGroup', (query) => {
        query.select('id', 'name') // Only select id and name from section_groups
      })
      .preload('user', (query) => {
        query.select('id', 'fullName') // Only select id and fullName from users
      })

    const results = await simpleFilter(
      ctx,
      baseQuery,
      ['firstName', 'lastName', 'comment', 'status'],
      []
    )
    return results
  }

  /**
   * Get a list of all users for dropdowns.
   */
  async getUsers({ response }: HttpContext) {
    const users = await User.query().select('id', 'fullName').orderBy('fullName', 'asc')
    return response.ok(users)
  }

  async getSectionGroups({ response }: HttpContext) {
    const sectionGroups = await SectionGroup.query().select('id', 'name').orderBy('name', 'asc')
    return response.ok(sectionGroups)
  }

  // Get one recruitment by id with any relations if needed
  async getOne({ params }: HttpContext) {
    return await Recruitment.query()
      .where('id', params.id)
      .preload('sectionGroup', (query) => {
        query.select('id', 'name')
      })
      .preload('user', (query) => {
        query.select('id', 'fullName')
      })
      .firstOrFail()
  }

  // Advanced search with more complex filtering
  async advancedSearch(ctx: HttpContext) {
    const baseQuery = Recruitment.query()
    const data = await advancedFilter(ctx, baseQuery)

    return {
      data,
      columns: {
        self: [
          'id',
          'firstName',
          'lastName',
          'contactDate',
          'contactedBy',
          'status',
          'statusUpdatedAt',
          'comment',
        ],
      },
    }
  }

  // Merge two recruitment records
  async mergeRecruitments(ctx: HttpContext) {
    const { recruitmentId1, recruitmentId2, ...fieldsToUpdate } = await ctx.request.validateUsing(
      mergeRecruitmentsValidator
    )

    if (recruitmentId1 === recruitmentId2) {
      return ctx.response.badRequest({ message: 'Cannot merge a recruitment with itself' })
    }

    // Use transaction for atomicity when performing multiple database operations
    const mergedRecruitment = await db.transaction(async (trx) => {
      // <--- CHANGE HERE
      const rec1 = await Recruitment.query()
        .useTransaction(trx)
        .where('id', recruitmentId1)
        .firstOrFail()
      const rec2 = await Recruitment.query()
        .useTransaction(trx)
        .where('id', recruitmentId2)
        .firstOrFail()

      // Apply updates to rec1 from validated fields, respecting `undefined` for optional fields
      rec1.merge(fieldsToUpdate)

      await rec1.save()
      await rec2.delete() // Delete the merged-into record

      return rec1
    })

    return ctx.response.ok({ message: 'Recruitments merged successfully', data: mergedRecruitment })
  }

  /**
   * Creates a new recruitment record.
   * This method now assumes NO ID is passed and always creates a new record.
   * If you need an `upsert` functionality, you'd create a separate method for it.
   */
  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(createRecruitmentValidator)

    // Check for existing recruitment based on first and last name BEFORE creation
    // This is a business logic decision. Adjust if uniqueness rules differ.
    const existing = await Recruitment.query()
      .where('firstName', payload.firstName)
      .andWhere('lastName', payload.lastName)
      .first()

    if (existing) {
      // You might return 409 Conflict if you don't want duplicates
      return ctx.response.conflict({
        message: 'Recruitment with this first and last name already exists.',
      })
    }

    const recruitment = await Recruitment.create(payload)

    return ctx.response.created({ message: 'Recruitment created successfully', data: recruitment })
  }

  /**
   * Updates an existing recruitment record.
   * This should be a separate method from creation and accept an ID in params.
   */
  async update({ params, request, response }: HttpContext) {
    const recruitment = await Recruitment.find(params.id)

    if (!recruitment) {
      return response.notFound({ message: 'Recruitment not found' })
    }

    const updatePayload = await request.validateUsing(
      vine.compile(
        vine.object({
          firstName: vine.string().trim().optional(),
          lastName: vine.string().trim().optional(),
          sectionGroupId: vine.number().optional(),
          contactDate: vine
            .string()
            .transform((val) => DateTime.fromISO(val))
            .optional(),
          contactedBy: vine.number().optional(),
          status: vine
            .enum([
              'awaiting response',
              'interested',
              'participating',
              'registered',
              'not available',
              'to be contacted',
              'cancelled',
              'other',
              'withdrawn',
            ])
            .optional(),
          comment: vine.string().trim().optional().nullable(),
        })
      )
    )

    recruitment.merge(updatePayload)
    await recruitment.save()

    return response.ok({ message: 'Recruitment updated successfully', data: recruitment })
  }

  // Delete recruitment by id
  async destroy({ params, response }: HttpContext) {
    const recruitment = await Recruitment.find(params.id)
    if (!recruitment) {
      return response.notFound({ error: 'Recruitment not found' })
    }

    await recruitment.delete()
    return response.noContent()
  }

  /**
   * Endpoint to perform the status update based on a provided datetime.
   */

  // async checkAndUpdateStatuses({ request, response }: HttpContext) {
  //   try {
  //     // ✅ Validate daysThreshold from frontend
  //     const { daysThreshold } = await vine
  //       .compile(
  //         vine.object({
  //           daysThreshold: vine.number().min(1).max(365),
  //         })
  //       )
  //       .validate(request.all())

  //     const now = DateTime.now().startOf('day')

  //     // ✅ Fetch all "awaiting response" recruitments
  //     const recruitments = await Recruitment.query().where('status', 'awaiting response')

  //     let updatedCount = 0

  //     for (const recruitment of recruitments) {
  //       if (!recruitment.contactDate) continue

  //       const contactDate = recruitment.contactDate.startOf('day')
  //       const daysSinceContact = now.diff(contactDate, 'days').days

  //       if (daysSinceContact > daysThreshold) {
  //         recruitment.status = 'to be contacted'
  //         recruitment.statusUpdatedAt = DateTime.now()
  //         await recruitment.save()
  //         updatedCount++
  //       }
  //     }

  //     return response.ok({
  //       message: `Updated ${updatedCount} recruitment(s) to "to be contacted" based on ${daysThreshold}-day threshold.`,
  //       updatedCount,
  //     })
  //   } catch (error) {
  //     return response.badRequest({
  //       message: 'Failed to process status update by threshold.',
  //       error: error.message,
  //     })
  //   }
  // }

  async checkAndUpdateStatuses({ request, response }: HttpContext) {
    try {
      // Validate the number of days (X) from frontend
      const { daysThreshold } = await vine
        .compile(vine.object({ daysThreshold: vine.number().min(1).max(365) }))
        .validate(request.all())

      const now = DateTime.now().startOf('day')

      // Fetch only recruitments with status 'awaiting response' or 'to be contacted'
      const recruitments = await Recruitment.query().whereIn('status', [
        'awaiting response',
        'to be contacted',
      ])

      let updatedCount = 0

      for (const recruitment of recruitments) {
        if (!recruitment.contactDate) continue

        const contactDate = recruitment.contactDate.startOf('day')
        const diffInDays = now.diff(contactDate, 'days').days

        if (diffInDays > daysThreshold && recruitment.status === 'awaiting response') {
          recruitment.status = 'to be contacted'
          recruitment.statusUpdatedAt = DateTime.now()
          await recruitment.save()
          updatedCount++
        }

        if (diffInDays <= daysThreshold && recruitment.status === 'to be contacted') {
          recruitment.status = 'awaiting response'
          recruitment.statusUpdatedAt = DateTime.now()
          await recruitment.save()
          updatedCount++
        }
      }

      return response.ok({
        message: `Statuses recalculated using threshold of ${daysThreshold} day(s).`,
        updatedCount,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Failed to update statuses.',
        error: error.message,
      })
    }
  }
}
