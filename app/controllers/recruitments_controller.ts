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
import Recruitment, { RecruitmentStatus } from '#models/recruitment'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import {
  createRecruitmentValidator,
  mergeRecruitmentsValidator,
  updateRecruitmentValidator,
} from '#validators/recruitment'
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

  async getAll(ctx: HttpContext) {
    try {
      const baseQuery = Recruitment.query()
        .preload('sectionGroup', (query) => {
          query.select('id', 'name')
        })
        .preload('user', (query) => {
          query.select('id', 'fullName')
        })

      const results = await this.simpleFilter(
        ctx,
        baseQuery,
        // Add 'sectionGroupId' and 'contactedBy' to the list of columns that can be filtered
        ['firstName', 'lastName', 'comment', 'status', 'sectionGroupId', 'contactedBy'],
        [] // Keep relation filtering empty unless you have specific nested filter needs
      )
      return results
    } catch (error) {
      console.error('Error in getAll:', error)
      return ctx.response.internalServerError({
        message: 'Failed to fetch recruitments.',
        error: error.message,
      })
    }
  }

  private async simpleFilter(ctx: HttpContext, query: any, columns: string[], relations: string[]) {
    const { request } = ctx
    const filters = request.qs()
    console.log('Backend query params:', filters) // Debug log

    columns.forEach((col) => {
      if (filters[col] !== undefined) {
        // Cast to number for numeric columns
        const value = ['sectionGroupId', 'contactedBy'].includes(col)
          ? Number(filters[col])
          : filters[col]

        if (value !== null && value !== undefined && !isNaN(value)) {
          console.log(`Applying filter: ${col} = ${value}`) // Debug log
          query.where(col, value)
        } else {
          console.log(`Skipping invalid filter: ${col} = ${filters[col]}`) // Debug log
        }
      }
    })

    const results = await query
    console.log('Filtered results:', results) // Debug log
    return results
  }

  /**
   * Get a list of all users for dropdowns.
   */
  async getUsers({ response }: HttpContext) {
    try {
      const users = await User.query().select('id', 'fullName').orderBy('fullName', 'asc')
      return response.ok(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      return response.internalServerError({
        message: 'Failed to fetch users.',
        error: error.message,
      })
    }
  }

  async getSectionGroups({ response }: HttpContext) {
    try {
      const sectionGroups = await SectionGroup.query().select('id', 'name').orderBy('name', 'asc')
      return response.ok(sectionGroups)
    } catch (error) {
      console.error('Error fetching section groups:', error)
      return response.internalServerError({
        message: 'Failed to fetch section groups.',
        error: error.message,
      })
    }
  }

  // Get one recruitment by id with any relations if needed
  async getOne({ params, response }: HttpContext) {
    try {
      return await Recruitment.query()
        .where('id', params.id)
        .preload('sectionGroup', (query) => {
          query.select('id', 'name')
        })
        .preload('user', (query) => {
          query.select('id', 'fullName')
        })
        .firstOrFail()
    } catch (error) {
      console.error('Error in getOne:', error)
      // AdonisJS's global exception handler will likely catch ModelNotFoundException
      // and convert it to 404, so explicit catch here might be redundant unless
      // you want a custom 404 message or further logic.
      if (error.code === 'E_ROW_NOT_FOUND') {
        // Example specific check for 404
        return response.notFound({ message: 'Recruitment not found' })
      }
      return response.internalServerError({
        message: 'Failed to fetch recruitment.',
        error: error.message,
      })
    }
  }

  // Advanced search with more complex filtering
  async advancedSearch(ctx: HttpContext) {
    try {
      const baseQuery = Recruitment.query()
        .preload('sectionGroup', (query) => {
          query.select('id', 'name')
        })
        .preload('user', (query) => {
          query.select('id', 'fullName')
        })
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
            'sectionGroup.name',
            'user.fullName',
          ],
        },
      }
    } catch (error) {
      console.error('Error in advancedSearch:', error)
      // adonisjs-filters might throw errors for invalid filter syntax.
      // Assuming a generic internal server error for now.
      return ctx.response.internalServerError({
        message: 'Failed to perform advanced search.',
        error: error.message,
      })
    }
  }

  // Merge two recruitment records
  // async mergeRecruitments(ctx: HttpContext) {
  //   const { recruitmentId1, recruitmentId2, ...fieldsToUpdate } = await ctx.request.validateUsing(
  //     mergeRecruitmentsValidator
  //   )

  //   if (recruitmentId1 === recruitmentId2) {
  //     return ctx.response.badRequest({ message: 'Cannot merge a recruitment with itself' })
  //   }

  //   const mergedRecruitment = await db.transaction(async (trx) => {
  //     const rec1 = await Recruitment.query()
  //       .useTransaction(trx)
  //       .where('id', recruitmentId1)
  //       .firstOrFail()
  //     const rec2 = await Recruitment.query()
  //       .useTransaction(trx)
  //       .where('id', recruitmentId2)
  //       .firstOrFail()

  //     let newContactDateForMerge: DateTime | null | undefined = rec1.contactDate
  //     let newContactedByForMerge: number | null | undefined = rec1.contactedBy

  //     const incomingStatus: RecruitmentStatus | undefined = fieldsToUpdate.status
  //     const oldStatus: RecruitmentStatus = rec1.status

  //     if (incomingStatus !== undefined) {
  //       if (oldStatus === 'not yet contacted' && incomingStatus !== 'not yet contacted') {
  //         newContactDateForMerge = DateTime.now().toUTC()
  //         newContactedByForMerge = fieldsToUpdate.contactedBy ?? null
  //       } else if (incomingStatus === 'not yet contacted') {
  //         newContactDateForMerge = null
  //         newContactedByForMerge = null
  //       } else {
  //         newContactDateForMerge = fieldsToUpdate.contactDate ?? rec1.contactDate
  //         newContactedByForMerge = fieldsToUpdate.contactedBy ?? rec1.contactedBy
  //       }
  //     } else {
  //       newContactDateForMerge = fieldsToUpdate.contactDate ?? rec1.contactDate
  //       newContactedByForMerge = fieldsToUpdate.contactedBy ?? rec1.contactedBy
  //     }

  //     const finalPayloadForMerge = { ...fieldsToUpdate }

  //     if (newContactDateForMerge === null) {
  //       finalPayloadForMerge.contactDate = undefined
  //     } else if (newContactDateForMerge instanceof DateTime) {
  //       finalPayloadForMerge.contactDate = newContactDateForMerge
  //     } else {
  //       delete finalPayloadForMerge.contactDate
  //     }

  //     if (newContactedByForMerge === null) {
  //       finalPayloadForMerge.contactedBy = undefined
  //     } else if (newContactedByForMerge !== undefined) {
  //       finalPayloadForMerge.contactedBy = newContactedByForMerge
  //     } else {
  //       delete finalPayloadForMerge.contactedBy
  //     }

  //     rec1.merge(finalPayloadForMerge)

  //     await rec1.save()
  //     await rec2.delete()

  //     return rec1
  //   })

  //   return ctx.response.ok({ message: 'Recruitments merged successfully', data: mergedRecruitment })
  // }

  // Merge two recruitment records
  async mergeRecruitments(ctx: HttpContext) {
    try {
      const { recruitmentId1, recruitmentId2, ...fieldsToUpdate } = await ctx.request.validateUsing(
        mergeRecruitmentsValidator
      )

      if (recruitmentId1 === recruitmentId2) {
        return ctx.response.badRequest({ message: 'Cannot merge a recruitment with itself' })
      }

      const mergedRecruitment = await db.transaction(async (trx) => {
        const rec1 = await Recruitment.query()
          .useTransaction(trx)
          .where('id', recruitmentId1)
          .firstOrFail() // Will throw if not found -> 404 from handler
        const rec2 = await Recruitment.query()
          .useTransaction(trx)
          .where('id', recruitmentId2)
          .firstOrFail() // Will throw if not found -> 404 from handler

        let newContactDateForMerge: DateTime | null | undefined = rec1.contactDate
        let newContactedByForMerge: number | null | undefined = rec1.contactedBy

        const incomingStatus: RecruitmentStatus | undefined = fieldsToUpdate.status
        const oldStatus: RecruitmentStatus = rec1.status

        if (incomingStatus !== undefined) {
          if (oldStatus === 'not yet contacted' && incomingStatus !== 'not yet contacted') {
            newContactDateForMerge = DateTime.now().toUTC()
            newContactedByForMerge = fieldsToUpdate.contactedBy ?? null
          } else if (incomingStatus === 'not yet contacted') {
            newContactDateForMerge = null
            newContactedByForMerge = null
          } else {
            newContactDateForMerge = fieldsToUpdate.contactDate ?? rec1.contactDate
            newContactedByForMerge = fieldsToUpdate.contactedBy ?? rec1.contactedBy
          }
        } else {
          newContactDateForMerge = fieldsToUpdate.contactDate ?? rec1.contactDate
          newContactedByForMerge = fieldsToUpdate.contactedBy ?? rec1.contactedBy
        }

        const finalPayloadForMerge = { ...fieldsToUpdate }

        if (newContactDateForMerge === null) {
          finalPayloadForMerge.contactDate = undefined
        } else if (newContactDateForMerge instanceof DateTime) {
          finalPayloadForMerge.contactDate = newContactDateForMerge
        } else {
          delete finalPayloadForMerge.contactDate
        }

        if (newContactedByForMerge === null) {
          finalPayloadForMerge.contactedBy = undefined
        } else if (newContactedByForMerge !== undefined) {
          finalPayloadForMerge.contactedBy = newContactedByForMerge
        } else {
          delete finalPayloadForMerge.contactedBy
        }

        rec1.merge(finalPayloadForMerge)

        await rec1.save()
        await rec2.delete()

        return rec1
      })

      return ctx.response.ok({
        message: 'Recruitments merged successfully',
        data: mergedRecruitment,
      })
    } catch (error) {
      console.error('Error in mergeRecruitments:', error)
      if (error.messages) {
        // VineJS validation error
        return ctx.response.badRequest({
          message: 'Validation failed for merge operation.',
          errors: error.messages,
        })
      }
      // This catch will also handle ModelNotFoundException from firstOrFail, which the global handler will turn to 404
      return ctx.response.internalServerError({
        message: 'Failed to merge recruitments.',
        error: error.message,
      })
    }
  }

  /**
   * Creates a new recruitment record.
   * This method now assumes NO ID is passed and always creates a new record.
   * If you need an `upsert` functionality, you'd create a separate method for it.
   */
  // async store(ctx: HttpContext) {
  //   const payload = await ctx.request.validateUsing(createRecruitmentValidator)

  //   // Check for existing recruitment based on first and last name BEFORE creation
  //   // This is a business logic decision. Adjust if uniqueness rules differ.
  //   const existing = await Recruitment.query()
  //     .where('firstName', payload.firstName)
  //     .andWhere('lastName', payload.lastName)
  //     .first()

  //   if (existing) {
  //     // You might return 409 Conflict if you don't want duplicates
  //     return ctx.response.conflict({
  //       message: 'Recruitment with this first and last name already exists.',
  //     })
  //   }

  //   const recruitment = await Recruitment.create(payload)

  //   return ctx.response.created({ message: 'Recruitment created successfully', data: recruitment })
  // }

  async store(ctx: HttpContext) {
    try {
      const payload = await ctx.request.validateUsing(createRecruitmentValidator)

      const existing = await Recruitment.query()
        .where('firstName', payload.firstName)
        .andWhere('lastName', payload.lastName)
        .first()

      if (existing) {
        return ctx.response.conflict({
          message: 'Recruitment with this first and last name already exists.',
        })
      }

      const finalStatus: RecruitmentStatus = payload.status || 'not yet contacted'

      // The validator now correctly allows contactDate and contactedBy to be null or undefined
      // when status is 'not yet contacted'. We can directly use payload values.
      let contactDateForCreate: DateTime | null | undefined = payload.contactDate
      let contactedByForCreate: number | null | undefined = payload.contactedBy

      if (finalStatus === 'not yet contacted') {
        // For 'not yet contacted', ensure contactDate and contactedBy are null (or undefined for DB)
        contactDateForCreate = null // Will store as NULL in DB
        contactedByForCreate = null // Will store as NULL in DB
      } else {
        // If status is not 'not yet contacted', ensure contactDate is present.
        // If not provided in payload, default to now.
        contactDateForCreate = payload.contactDate ?? DateTime.now().toUTC()
        contactedByForCreate = payload.contactedBy ?? null // If not provided, allow null.
      }

      const recruitment = await Recruitment.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        sectionGroupId: payload.sectionGroupId,
        comment: payload.comment,
        status: finalStatus,
        contactDate: contactDateForCreate,
        contactedBy: contactedByForCreate,
      })

      return ctx.response.created({
        message: 'Recruitment created successfully',
        data: recruitment,
      })
    } catch (error) {
      console.error('Error in store:', error)
      if (error.messages) {
        // VineJS validation error
        return ctx.response.badRequest({
          message: 'Validation failed for creation.',
          errors: error.messages,
        })
      }
      // Catch other unexpected errors
      return ctx.response.internalServerError({
        message: 'Failed to create recruitment.',
        error: error.message,
      })
    }
  }

  /**
   * Updates an existing recruitment record.
   * This should be a separate method from creation and accept an ID in params.
   */
  // async update({ params, request, response }: HttpContext) {
  //   const recruitment = await Recruitment.find(params.id)

  //   if (!recruitment) {
  //     return response.notFound({ message: 'Recruitment not found' })
  //   }

  //   const updatePayload = await request.validateUsing(
  //     vine.compile(
  //       vine.object({
  //         firstName: vine.string().trim().optional(),
  //         lastName: vine.string().trim().optional(),
  //         sectionGroupId: vine.number().optional(),
  //         contactDate: vine
  //           .string()
  //           .transform((val) => DateTime.fromISO(val))
  //           .optional(),
  //         contactedBy: vine.number().optional(),
  //         status: vine
  //           .enum([
  //             'awaiting response',
  //             'interested',
  //             'participating',
  //             'registered',
  //             'not available',
  //             'to be contacted',
  //             'cancelled',
  //             'other',
  //             'withdrawn',
  //           ])
  //           .optional(),
  //         comment: vine.string().trim().optional().nullable(),
  //       })
  //     )
  //   )

  //   recruitment.merge(updatePayload)
  //   await recruitment.save()

  //   return response.ok({ message: 'Recruitment updated successfully', data: recruitment })
  // }

  async update({ params, request, response }: HttpContext) {
    try {
      const recruitment = await Recruitment.find(params.id)

      if (!recruitment) {
        return response.notFound({ message: 'Recruitment not found' })
      }

      // --- USING THE NEW updateRecruitmentValidator ---
      const updatePayload = await request.validateUsing(updateRecruitmentValidator)
      // --- END NEW VALIDATOR USE ---

      let newContactDateValue: DateTime | null | undefined = recruitment.contactDate
      let newContactedByValue: number | null | undefined = recruitment.contactedBy

      const incomingStatus: RecruitmentStatus | undefined = updatePayload.status
      const oldStatus: RecruitmentStatus = recruitment.status

      if (incomingStatus !== undefined) {
        if (oldStatus === 'not yet contacted' && incomingStatus !== 'not yet contacted') {
          newContactDateValue = DateTime.now().toUTC()
          newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
        } else if (incomingStatus === 'not yet contacted') {
          newContactDateValue = null
          newContactedByValue = null
        } else {
          newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
          newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
        }
      } else {
        newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
        newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
      }

      recruitment.merge({
        ...updatePayload,
        contactDate: newContactDateValue,
        contactedBy: newContactedByValue,
      })
      await recruitment.save()

      return response.ok({ message: 'Recruitment updated successfully', data: recruitment })
    } catch (error) {
      console.error('Error in update:', error)
      if (error.messages) {
        // VineJS validation error
        return response.badRequest({
          message: 'Validation failed for update.',
          errors: error.messages,
        })
      }
      // This catch will also handle ModelNotFoundException from findOrFail (if used), which global handler turns to 404
      return response.internalServerError({
        message: 'Failed to update recruitment.',
        error: error.message,
      })
    }
  }

  // Delete recruitment by id
  async destroy({ params, response }: HttpContext) {
    try {
      const recruitment = await Recruitment.find(params.id)
      if (!recruitment) {
        return response.notFound({ error: 'Recruitment not found' })
      }

      await recruitment.delete()
      return response.noContent()
    } catch (error) {
      console.error('Error in destroy:', error)
      // This catch will also handle ModelNotFoundException if findOrFail is used.
      return response.internalServerError({
        message: 'Failed to delete recruitment.',
        error: error.message,
      })
    }
  }

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
          recruitment.status = 'to follow up'
          recruitment.statusUpdatedAt = DateTime.now()
          await recruitment.save()
          updatedCount++
        }

        if (diffInDays <= daysThreshold && recruitment.status === 'to follow up') {
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
      // Improved error handling for this specific method
      if (error.messages) {
        // VineJS validation errors
        return response.badRequest({
          message: 'Validation failed for status update check.',
          errors: error.messages,
        })
      }
      console.error('Error in checkAndUpdateStatuses:', error) // Log the actual error
      return response.internalServerError({
        // Consistent 500 for unexpected errors
        message: 'An unexpected error occurred during status update check.',
        error: error.message, // Include error message in dev, hide in prod via handler
      })
    }
  }
}
