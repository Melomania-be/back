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

// export const checkStatusValidator = vine.compile(
//   vine.object({
//     checkDateTime: vine
//       .string()
//       .trim()
//       .transform((value, field) => {
//         const dateTime = DateTime.fromISO(value, { zone: 'utc' })
//         if (!dateTime.isValid) {
//           field.report(
//             'The {{ field }} must be a valid ISO datetime string.',
//             'invalid_datetime',
//             field
//           )
//         }
//         return dateTime
//       })
//       .optional()
//       .nullable(),
//   })
// )

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

      // Fetch only recruitments with status 'awaiting response' or 'to follow up'
      const recruitments = await Recruitment.query().whereIn('status', [
        'awaiting response',
        'to follow up',
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

  // async checkAndUpdateStatuses({ request, response }: HttpContext) {
  //   try {
  //     const { daysThreshold } = await vine
  //       .compile(vine.object({ daysThreshold: vine.number().min(1).max(365) }))
  //       .validate(request.all())

  //     const now = DateTime.now().startOf('day')
  //     const thresholdDate = now.minus({ days: daysThreshold }).startOf('day') // This is the date boundary

  //     let updatedCount = 0 // For 'awaiting response' -> 'to follow up'
  //     let revertedCount = 0 // For 'to follow up' -> 'awaiting response'
  //     let failedCount = 0 // For any individual save failures

  //     // --- CRITICAL FIX: Wrap the entire process in a single transaction ---
  //     await db.transaction(async (trx) => {
  //       // Fetch all relevant recruitments that *might* need a status change.
  //       // We need to fetch both 'awaiting response' and 'to follow up' statuses.
  //       const recruitmentsToProcess = await Recruitment.query()
  //         .useTransaction(trx) // Associate query with the transaction
  //         .whereIn('status', [
  //           'awaiting response',
  //           'to follow up', // FIX: Use 'to follow up' as per your current enum
  //         ])
  //         .andWhereNotNull('contactDate') // Only process records that have been contacted
  //         .andWhere('contactDate', '<=', now.toISODate()) // Only consider contact dates up to today
  //         .forUpdate() // Acquire row-level locks for safety during updates

  //       // Execute the query to get the candidates
  //       const candidates = await recruitmentsToProcess

  //       if (candidates.length === 0) {
  //         return response.ok({
  //           message: 'No recruitments found requiring status re-evaluation.',
  //           updatedCount: 0,
  //           revertedCount: 0,
  //           failedCount: 0,
  //         })
  //       }

  //       // Iterate and update each candidate based on the current threshold
  //       for (const recruitment of candidates) {
  //         // Defensive check, though andWhereNotNull should prevent this
  //         if (!recruitment.contactDate) {
  //           continue
  //         }

  //         const contactDate = recruitment.contactDate.startOf('day')
  //         const diffInDays = now.diff(contactDate, 'days').days

  //         try {
  //           if (diffInDays > daysThreshold && recruitment.status === 'awaiting response') {
  //             // Rule 1: Change from 'awaiting response' to 'to follow up' if older than threshold
  //             recruitment.status = 'to follow up'
  //             recruitment.statusUpdatedAt = DateTime.now()
  //             await recruitment.save() // Save within the transaction
  //             updatedCount++
  //           } else if (diffInDays <= daysThreshold && recruitment.status === 'to follow up') {
  //             // Rule 2: Change from 'to follow up' back to 'awaiting response' if within threshold
  //             recruitment.status = 'awaiting response'
  //             recruitment.statusUpdatedAt = DateTime.now()
  //             await recruitment.save() // Save within the transaction
  //             revertedCount++
  //           }
  //           // If neither condition is met, the status remains as is.
  //         } catch (updateError) {
  //           failedCount++
  //           console.error(
  //             `Failed to update recruitment ID: ${recruitment.id}. Error: ${updateError.message}`
  //           )
  //         }
  //       }
  //     }) // Transaction commits here if successful, or rolls back if an error occurs

  //     return response.ok({
  //       message: `Statuses re-evaluated using threshold of ${daysThreshold} day(s). Updated: ${updatedCount}, Reverted: ${revertedCount}, Failed: ${failedCount}.`,
  //       updatedCount,
  //       revertedCount,
  //       failedCount,
  //     })
  //   } catch (error) {
  //     // Improved error handling for this specific method
  //     if (error.messages) {
  //       // VineJS validation errors
  //       return response.badRequest({
  //         message: 'Validation failed for status re-evaluation.',
  //         errors: error.messages,
  //       })
  //     }
  //     console.error('Error in checkAndUpdateStatuses:', error) // Log the actual error
  //     return response.internalServerError({
  //       message: 'An unexpected error occurred during status re-evaluation.',
  //       error: error.message, // Include error message in dev, hide in prod via handler
  //     })
  //   }
  // }
}
