import { HttpContext } from '@adonisjs/core/http'
import Recruitment, { RecruitmentStatus } from '#models/recruitment'
import { advancedFilter } from 'adonisjs-filters'
import {
  createRecruitmentValidator,
  mergeRecruitmentsValidator,
  updateRecruitmentValidator,
} from '#validators/recruitment'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
// import SectionGroup from '#models/section_group'
import Project from '#models/project'
import Section from '#models/section'

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

  // async getAll(ctx: HttpContext) {
  //   try {
  //     const baseQuery = Recruitment.query()
  //       .preload('sectionGroup', (query) => {
  //         query.select('id', 'name')
  //       })
  //       .preload('user', (query) => {
  //         query.select('id', 'fullName')
  //       })

  //     const results = await this.simpleFilter(
  //       ctx,
  //       baseQuery,
  //       // Add 'sectionGroupId' and 'contactedBy' to the list of columns that can be filtered
  //       ['firstName', 'lastName', 'comment', 'status', 'sectionGroupId', 'contactedBy'],
  //       [] // Keep relation filtering empty unless you have specific nested filter needs
  //     )
  //     return results
  //   } catch (error) {
  //     console.error('Error in getAll:', error)
  //     return ctx.response.internalServerError({
  //       message: 'Failed to fetch recruitments.',
  //       error: error.message,
  //     })
  //   }
  // }

  // async getAll(ctx: HttpContext) {
  //   const baseQuery = Recruitment.query()
  //     .preload('sectionGroup', (query) => {
  //       query.select('id', 'name')
  //     })
  //     .preload('user', (query) => {
  //       query.select('id', 'fullName')
  //     })

  //   // --- MODIFIED: Call our new private filter method ---
  //   const results = await this._applySimpleFilters(
  //     ctx,
  //     baseQuery,
  //     ['firstName', 'lastName', 'comment', 'status', 'sectionGroupId', 'contactedBy', 'contactDate'] // Include contactDate here
  //   )
  //   // --- END MODIFIED ---
  //   return results
  // }

  async getAll(ctx: HttpContext) {
    const { request } = ctx
    const filters = request.qs() // Get query string parameters

    const baseQuery = Recruitment.query()
      .preload('section', (query) => {
        query.select('id', 'name')
      })
      .preload('user', (query) => {
        query.select('id', 'fullName')
      })
      .preload('project', (query) => {
        // NEW: Preload the project relationship
        query.select('id', 'name') // Select only necessary project fields
      })

    // --- NEW: Filter by projectId from query string ---
    if (
      filters.projectId !== undefined &&
      filters.projectId !== null &&
      String(filters.projectId).trim() !== ''
    ) {
      const projectId = Number(filters.projectId)
      if (!isNaN(projectId)) {
        baseQuery.where('projectId', projectId)
      } else if (filters.projectId === 'null') {
        // Handle explicit 'null' string from frontend for unassigned
        baseQuery.whereNull('projectId')
      }
    }
    // --- END NEW ---

    // Apply other simple filters (using your custom _applySimpleFilters)
    const results = await this._applySimpleFilters(ctx, baseQuery, [
      'firstName',
      'lastName',
      'comment',
      'status',
      'sectionId',
      'contactedBy',
      'contactDate',
    ])
    return results
  }

  // private async simpleFilter(ctx: HttpContext, query: any, columns: string[], relations: string[]) {
  //   const { request } = ctx
  //   const filters = request.qs()
  //   console.log('Backend query params:', filters) // Debug log

  //   columns.forEach((col) => {
  //     if (filters[col] !== undefined) {
  //       // Cast to number for numeric columns
  //       const value = ['sectionGroupId', 'contactedBy'].includes(col)
  //         ? Number(filters[col])
  //         : filters[col]

  //       if (value !== null && value !== undefined && !isNaN(value)) {
  //         console.log(`Applying filter: ${col} = ${value}`) // Debug log
  //         query.where(col, value)
  //       } else {
  //         console.log(`Skipping invalid filter: ${col} = ${filters[col]}`) // Debug log
  //       }
  //     }
  //   })

  //   const results = await query
  //   console.log('Filtered results:', results) // Debug log
  //   return results
  // }

  // --- NEW PRIVATE METHOD: _applySimpleFilters ---
  private async _applySimpleFilters(
    ctx: HttpContext,
    query: any, // Use `any` for the query builder for flexibility
    filterableColumns: string[]
  ) {
    const { request } = ctx
    const filters = request.qs() // Get all query string parameters

    for (const col of filterableColumns) {
      const filterValue = filters[col]

      // Only apply filter if the value is provided (not undefined, null, or empty string after trim)
      if (filterValue !== undefined && filterValue !== null && String(filterValue).trim() !== '') {
        console.log(`Applying filter: ${col} = ${filterValue}`) // Debug log

        switch (col) {
          case 'sectionId':
          case 'contactedBy':
            // Cast to number for integer columns
            const numericValue = Number(filterValue)
            if (!isNaN(numericValue)) {
              query.where(col, numericValue)
            }
            break
          case 'contactDate':
            // For date columns, ensure it's a valid date string (YYYY-MM-DD)
            // The frontend sends YYYY-MM-DD, which matches database 'date' type
            query.where(col, filterValue)
            break
          case 'firstName':
          case 'lastName':
          case 'comment':
            // For string fields, use 'like' for partial matching (case-insensitive)
            // If exact match is required, change to query.where(col, filterValue);
            query.where(col, 'ILIKE', `%${filterValue}%`) // ILIKE for case-insensitive LIKE in PostgreSQL
            break
          case 'status':
            if (Array.isArray(filterValue)) {
              // If multiple statuses are selected, use whereIn
              query.whereIn(col, filterValue)
            } else {
              // If only one status is selected (or if it's an empty string for 'All'), use where
              // The frontend should send an empty array for 'All', not an empty string.
              // So, this else block will only hit if a single status is selected.
              query.where(col, filterValue)
            }
            break
          default:
            // For any other column, apply exact match
            query.where(col, filterValue)
            break
        }
      }
    }

    const results = await query
    console.log('Filtered results:', results) // Debug log
    return results
  }

  // --- NEW METHOD: getProjectsForDropdown ---
  /**
   * Get a list of all projects for dropdowns.
   */
  async getProjectsForDropdown({ response }: HttpContext) {
    try {
      const projects = await Project.query().select('id', 'name').orderBy('name', 'asc')
      return response.ok(projects)
    } catch (error) {
      console.error('Error fetching projects for dropdown:', error)
      return response.internalServerError({ message: 'Failed to retrieve project list.' })
    }
  }

  /**
   * Get a list of all sections for dropdowns.
   */
  async getSectionsForDropdown({ response }: HttpContext) {
    try {
      const sections = await Section.query().select('id', 'name').orderBy('name', 'asc')
      return response.ok(sections)
    } catch (error) {
      console.error('Error fetching sections for dropdown:', error)
      return response.internalServerError({ message: 'Failed to retrieve section list.' })
    }
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

  // async getSectionGroups({ response }: HttpContext) {
  //   try {
  //     const sectionGroups = await SectionGroup.query().select('id', 'name').orderBy('name', 'asc')
  //     return response.ok(sectionGroups)
  //   } catch (error) {
  //     console.error('Error fetching section groups:', error)
  //     return response.internalServerError({
  //       message: 'Failed to fetch section groups.',
  //       error: error.message,
  //     })
  //   }
  // }

  // Get one recruitment by id with any relations if needed
  // async getOne({ params, response }: HttpContext) {
  //   try {
  //     return await Recruitment.query()
  //       .where('id', params.id)
  //       .preload('sectionGroup', (query) => {
  //         query.select('id', 'name')
  //       })
  //       .preload('user', (query) => {
  //         query.select('id', 'fullName')
  //       })
  //       .firstOrFail()
  //   } catch (error) {
  //     console.error('Error in getOne:', error)
  //     // AdonisJS's global exception handler will likely catch ModelNotFoundException
  //     // and convert it to 404, so explicit catch here might be redundant unless
  //     // you want a custom 404 message or further logic.
  //     if (error.code === 'E_ROW_NOT_FOUND') {
  //       // Example specific check for 404
  //       return response.notFound({ message: 'Recruitment not found' })
  //     }
  //     return response.internalServerError({
  //       message: 'Failed to fetch recruitment.',
  //       error: error.message,
  //     })
  //   }
  // }

  async getOne({ params, response }: HttpContext) {
    try {
      return await Recruitment.query()
        .where('id', params.id)
        .preload('section', (query) => {
          query.select('id', 'name')
        })
        .preload('user', (query) => {
          query.select('id', 'fullName')
        })
        .preload('project', (query) => {
          // NEW: Preload the project relationship
          query.select('id', 'name')
        })
        .firstOrFail()
    } catch (error) {
      console.error('Error in getOne:', error)
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Recruitment not found' })
      }
      return response.internalServerError({
        message: 'Failed to fetch recruitment.',
        error: error.message,
      })
    }
  }

  // Advanced search with more complex filtering
  // async advancedSearch(ctx: HttpContext) {
  //   try {
  //     const baseQuery = Recruitment.query()
  //       .preload('sectionGroup', (query) => {
  //         query.select('id', 'name')
  //       })
  //       .preload('user', (query) => {
  //         query.select('id', 'fullName')
  //       })
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
  //           'sectionGroup.name',
  //           'user.fullName',
  //         ],
  //       },
  //     }
  //   } catch (error) {
  //     console.error('Error in advancedSearch:', error)
  //     // adonisjs-filters might throw errors for invalid filter syntax.
  //     // Assuming a generic internal server error for now.
  //     return ctx.response.internalServerError({
  //       message: 'Failed to perform advanced search.',
  //       error: error.message,
  //     })
  //   }
  // }

  async advancedSearch(ctx: HttpContext) {
    const { request } = ctx
    const filters = request.qs() // Get query string parameters

    const baseQuery = Recruitment.query()
      .preload('section', (query) => {
        query.select('id', 'name')
      })
      .preload('user', (query) => {
        query.select('id', 'fullName')
      })
      .preload('project', (query) => {
        // NEW: Preload the project relationship
        query.select('id', 'name')
      })

    // --- NEW: Filter by projectId from query string for advanced search ---
    if (
      filters.projectId !== undefined &&
      filters.projectId !== null &&
      String(filters.projectId).trim() !== ''
    ) {
      const projectId = Number(filters.projectId)
      if (!isNaN(projectId)) {
        baseQuery.where('projectId', projectId)
      } else if (filters.projectId === 'null') {
        // Handle explicit 'null' string from frontend for unassigned
        baseQuery.whereNull('projectId')
      }
    }
    // --- END NEW ---

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
          'section.name',
          'user.fullName',
          'project.name', // NEW: Include project name for display
        ],
      },
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

  // async store(ctx: HttpContext) {
  //   try {
  //     const payload = await ctx.request.validateUsing(createRecruitmentValidator)

  //     const existing = await Recruitment.query()
  //       .where('firstName', payload.firstName)
  //       .andWhere('lastName', payload.lastName)
  //       .first()

  //     if (existing) {
  //       return ctx.response.conflict({
  //         message: 'Recruitment with this first and last name already exists.',
  //       })
  //     }

  //     const finalStatus: RecruitmentStatus = payload.status || 'not yet contacted'

  //     // The validator now correctly allows contactDate and contactedBy to be null or undefined
  //     // when status is 'not yet contacted'. We can directly use payload values.
  //     let contactDateForCreate: DateTime | null | undefined = payload.contactDate
  //     let contactedByForCreate: number | null | undefined = payload.contactedBy

  //     if (finalStatus === 'not yet contacted') {
  //       // For 'not yet contacted', ensure contactDate and contactedBy are null (or undefined for DB)
  //       contactDateForCreate = null // Will store as NULL in DB
  //       contactedByForCreate = null // Will store as NULL in DB
  //     } else {
  //       // If status is not 'not yet contacted', ensure contactDate is present.
  //       // If not provided in payload, default to now.
  //       contactDateForCreate = payload.contactDate ?? DateTime.now().toUTC()
  //       contactedByForCreate = payload.contactedBy ?? null // If not provided, allow null.
  //     }

  //     const recruitment = await Recruitment.create({
  //       firstName: payload.firstName,
  //       lastName: payload.lastName,
  //       sectionGroupId: payload.sectionGroupId,
  //       comment: payload.comment,
  //       status: finalStatus,
  //       contactDate: contactDateForCreate,
  //       contactedBy: contactedByForCreate,
  //     })

  //     return ctx.response.created({
  //       message: 'Recruitment created successfully',
  //       data: recruitment,
  //     })
  //   } catch (error) {
  //     console.error('Error in store:', error)
  //     if (error.messages) {
  //       // VineJS validation error
  //       return ctx.response.badRequest({
  //         message: 'Validation failed for creation.',
  //         errors: error.messages,
  //       })
  //     }
  //     // Catch other unexpected errors
  //     return ctx.response.internalServerError({
  //       message: 'Failed to create recruitment.',
  //       error: error.message,
  //     })
  //   }
  // }

  // async store(ctx: HttpContext) {
  //   try {
  //     const payload = await ctx.request.validateUsing(createRecruitmentValidator)

  //     const existing = await Recruitment.query()
  //       .where('firstName', payload.firstName)
  //       .andWhere('lastName', payload.lastName)
  //       .first()

  //     if (existing) {
  //       return ctx.response.conflict({
  //         message: 'Recruitment with this first and last name already exists.',
  //       })
  //     }

  //     const finalStatus: RecruitmentStatus = payload.status || 'not yet contacted'

  //     let contactDateForCreate: DateTime | null = null // Initialize as null
  //     let contactedByForCreate: number | null = null // Initialize as null

  //     if (finalStatus === 'not yet contacted') {
  //       contactDateForCreate = null // contactDate remains null for 'not yet contacted'
  //       // --- MODIFIED: contactedBy is taken from payload, not forced to null ---
  //       contactedByForCreate = payload.contactedBy ?? null // Use payload's value, or null if not provided
  //       // --- END MODIFIED ---
  //     } else {
  //       contactDateForCreate = payload.contactDate ?? DateTime.now().toUTC()
  //       contactedByForCreate = payload.contactedBy ?? null
  //     }

  //     const recruitment = await Recruitment.create({
  //       firstName: payload.firstName,
  //       lastName: payload.lastName,
  //       sectionGroupId: payload.sectionGroupId,
  //       comment: payload.comment,
  //       status: finalStatus,
  //       contactDate: contactDateForCreate,
  //       contactedBy: contactedByForCreate, // Use the determined value
  //     })

  //     return ctx.response.created({
  //       message: 'Recruitment created successfully',
  //       data: recruitment,
  //     })
  //   } catch (error) {
  //     console.error('Error creating user:', error)
  //     if (error.messages) {
  //       return ctx.response.badRequest({
  //         message: 'Validation failed for user creation.',
  //         errors: error.messages,
  //       })
  //     }
  //     return ctx.response.internalServerError({ message: 'Failed to create user.' })
  //   }
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

      let contactDateForCreate: DateTime | null = null
      let contactedByForCreate: number | null = null
      let projectIdForCreate: number | null = null // NEW: Initialize projectId
      let sectionIdForCreate: number | null = null

      if (finalStatus === 'not yet contacted') {
        contactDateForCreate = null
        contactedByForCreate = payload.contactedBy ?? null
      } else {
        contactDateForCreate = payload.contactDate ?? DateTime.now().toUTC()
        contactedByForCreate = payload.contactedBy ?? null
      }

      // --- NEW: Handle projectId from payload ---
      // If payload.projectId is undefined, it will remain null. If it's a number, use it.
      // If it's explicitly null from frontend, it will be null.
      projectIdForCreate = payload.projectId ?? null
      sectionIdForCreate = payload.sectionId ?? null
      // --- END NEW ---

      const recruitment = await Recruitment.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        // sectionGroupId: payload.sectionGroupId,
        sectionId: sectionIdForCreate,
        comment: payload.comment,
        status: finalStatus,
        contactDate: contactDateForCreate,
        contactedBy: contactedByForCreate,
        projectId: projectIdForCreate, // NEW: Assign projectId
      })

      return ctx.response.created({
        message: 'Recruitment created successfully',
        data: recruitment,
      })
    } catch (error) {
      console.error('Error creating user:', error)
      if (error.messages) {
        return ctx.response.badRequest({
          message: 'Validation failed for user creation.',
          errors: error.messages,
        })
      }
      return ctx.response.internalServerError({ message: 'Failed to create user.' })
    }
  }

  // async update({ params, request, response }: HttpContext) {
  //   try {
  //     const recruitment = await Recruitment.find(params.id)
  //     if (!recruitment) {
  //       return response.notFound({ message: 'Recruitment not found' })
  //     }

  //     const updatePayload = await request.validateUsing(updateRecruitmentValidator)

  //     let newContactDateValue: DateTime | null = recruitment.contactDate // Initialize with current DB value
  //     let newContactedByValue: number | null = recruitment.contactedBy // Initialize with current DB value

  //     const incomingStatus: RecruitmentStatus | undefined = updatePayload.status
  //     const oldStatus: RecruitmentStatus = recruitment.status

  //     if (incomingStatus !== undefined) {
  //       // If status is being changed by the payload
  //       if (oldStatus === 'not yet contacted' && incomingStatus !== 'not yet contacted') {
  //         // Status changes FROM 'not yet contacted' TO something else
  //         newContactDateValue = DateTime.now().toUTC() // Set contactDate to now
  //         // --- MODIFIED: contactedBy is taken from payload, not forced to null ---
  //         newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy // Use payload's value or keep existing
  //         // --- END MODIFIED ---
  //       } else if (incomingStatus === 'not yet contacted') {
  //         // Status changes TO 'not yet contacted'
  //         newContactDateValue = null // Clear contactDate
  //         // --- MODIFIED: contactedBy is taken from payload, not forced to null ---
  //         newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy // Use payload's value or keep existing
  //         // --- END MODIFIED ---
  //       } else {
  //         // Status changed to something else, not involving 'not yet contacted'
  //         newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
  //         newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
  //       }
  //     } else {
  //       // Status is NOT changing, just other fields are potentially changing
  //       newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
  //       newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
  //     }

  //     recruitment.merge({
  //       ...updatePayload,
  //       contactDate: newContactDateValue,
  //       contactedBy: newContactedByValue,
  //     })
  //     await recruitment.save()

  //     return response.ok({ message: 'Recruitment updated successfully', data: recruitment })
  //   } catch (error) {
  //     console.error('Error in update:', error)
  //     if (error.messages) {
  //       return response.badRequest({
  //         message: 'Validation failed for update.',
  //         errors: error.messages,
  //       })
  //     }
  //     return response.internalServerError({
  //       message: 'Failed to update recruitment.',
  //       error: error.message,
  //     })
  //   }
  // }

  async update({ params, request, response }: HttpContext) {
    try {
      const recruitment = await Recruitment.find(params.id)
      if (!recruitment) {
        return response.notFound({ message: 'Recruitment not found' })
      }

      const updatePayload = await request.validateUsing(updateRecruitmentValidator)

      let newContactDateValue: DateTime | null = recruitment.contactDate
      let newContactedByValue: number | null = recruitment.contactedBy
      let newProjectIdValue: number | null = recruitment.projectId // NEW: Initialize projectId
      let newSectionIdValue: number | null = recruitment.sectionId

      const incomingStatus: RecruitmentStatus | undefined = updatePayload.status
      const oldStatus: RecruitmentStatus = recruitment.status

      if (incomingStatus !== undefined) {
        if (oldStatus === 'not yet contacted' && incomingStatus !== 'not yet contacted') {
          newContactDateValue = DateTime.now().toUTC()
          newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
        } else if (incomingStatus === 'not yet contacted') {
          newContactDateValue = null
          newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
        } else {
          newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
          newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
        }
      } else {
        newContactDateValue = updatePayload.contactDate ?? recruitment.contactDate
        newContactedByValue = updatePayload.contactedBy ?? recruitment.contactedBy
      }

      // --- NEW: Handle projectId from updatePayload ---
      // If projectId is provided in payload, use it. Otherwise, keep existing.
      // If payload.projectId is explicitly null, it will be set to null.
      newProjectIdValue = updatePayload.projectId ?? recruitment.projectId
      newSectionIdValue = updatePayload.sectionId ?? recruitment.sectionId
      // --- END NEW ---

      recruitment.merge({
        ...updatePayload,
        contactDate: newContactDateValue,
        contactedBy: newContactedByValue,
        projectId: newProjectIdValue, // NEW: Assign projectId
        sectionId: newSectionIdValue,
      })
      await recruitment.save()

      return response.ok({ message: 'Recruitment updated successfully', data: recruitment })
    } catch (error) {
      console.error('Error in update:', error)
      if (error.messages) {
        return response.badRequest({
          message: 'Validation failed for update.',
          errors: error.messages,
        })
      }
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

  async copyRecruitmentsToProject({ request, response }: HttpContext) {
    const { recruitmentIds, targetProjectId } = request.body()

    // --- LOG 1: Incoming Request Data ---
    console.log('LOG: copyRecruitmentsToProject - Received request data:', {
      recruitmentIds,
      targetProjectId,
    })

    // 1. Validate Input: recruitmentIds
    if (!Array.isArray(recruitmentIds) || recruitmentIds.length === 0) {
      console.log('LOG: Validation failed: recruitmentIds missing or empty.')
      return response.badRequest({
        message: 'recruitmentIds (array of numbers) is required and cannot be empty.',
      })
    }
    if (recruitmentIds.some((id) => typeof id !== 'number' || !Number.isInteger(id))) {
      console.log('LOG: Validation failed: All recruitmentIds must be integers.')
      return response.badRequest({ message: 'All recruitmentIds must be integers.' })
    }

    // 2. Validate and Parse Input: targetProjectId
    let finalTargetProjectId: number | null

    if (targetProjectId === null) {
      finalTargetProjectId = null
    } else {
      const numericTargetProjectId = Number(targetProjectId)
      if (isNaN(numericTargetProjectId) || !Number.isInteger(numericTargetProjectId)) {
        console.log('LOG: Validation failed: Invalid targetProjectId.')
        return response.badRequest({
          message: 'Invalid targetProjectId provided. Must be an integer or null.',
        })
      }
      finalTargetProjectId = numericTargetProjectId
    }
    console.log('LOG: Parsed finalTargetProjectId:', finalTargetProjectId)

    try {
      let copiedCount = 0
      await db.transaction(async (trx) => {
        // Fetch the original recruitment records
        const originalRecruitments = await Recruitment.query()
          .useTransaction(trx)
          .whereIn('id', recruitmentIds)

        // --- LOG 2: Original Recruitments Fetched ---
        console.log(
          'LOG: Original recruitments fetched (IDs):',
          originalRecruitments.map((r) => r.id)
        )

        if (originalRecruitments.length === 0) {
          console.log('LOG: No original recruitments found for provided IDs.')
          throw new Error('No original recruitments found for the provided IDs.')
        }

        // Prepare new recruitment data as plain JavaScript objects for insertion
        const newRecruitmentsData = originalRecruitments.map((original) => {
          // Get current UTC timestamp for created_at and updated_at
          const now = DateTime.now().toUTC().toISO() // ISO string format

          return {
            first_name: original.firstName,
            last_name: original.lastName,
            section_id: original.sectionId,
            comment: original.comment,

            project_id: finalTargetProjectId,
            status: 'not yet contacted' as RecruitmentStatus,
            contact_date: null,
            contacted_by: null,

            // --- FIX APPLIED HERE: Manually set created_at and updated_at ---
            created_at: now,
            updated_at: now,
            // --- END FIX ---
          }
        })

        // --- LOG 3: Data Prepared for Insertion ---
        console.log(
          'LOG: Data prepared for insertion (first 2 records):',
          JSON.stringify(newRecruitmentsData.slice(0, 2), null, 2)
        )
        if (newRecruitmentsData.length > 2) {
          console.log(`LOG: ...and ${newRecruitmentsData.length - 2} more records.`)
        }

        // Insert all new recruitments in a batch within the transaction
        const createdRecords = await db
          .table('recruitments')
          .useTransaction(trx)
          .insert(newRecruitmentsData)
          .returning('id')

        // --- LOG 4: Records Created ---
        console.log('LOG: Successfully created records with IDs:', createdRecords)

        copiedCount = createdRecords.length
      })

      return response.ok({
        message: `${copiedCount} recruitment(s) successfully copied and status set to 'not yet contacted'.`,
      })
    } catch (error: any) {
      // --- LOG 5: Error Caught ---
      console.error('LOG: Error copying recruitments to project - Detailed Error:', error)
      console.error('LOG: Error message:', error.message)
      console.error('LOG: Error code:', error.code)
      console.error('LOG: Error stack:', error.stack)

      if (error.message === 'No original recruitments found for the provided IDs.') {
        return response.notFound({ message: error.message })
      }

      return response.internalServerError({
        message: 'Failed to copy recruitments. Please try again.',
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
}
