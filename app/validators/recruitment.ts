// import vine from '@vinejs/vine'
// import { DateTime } from 'luxon'

// export const createRecruitmentValidator = vine.compile(
//   vine.object({
//     id: vine.number().optional(),
//     firstName: vine.string(),
//     lastName: vine.string(),
//     contactDate: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(), // ISO string date, adjust if you want Date type validator
//     contactedBy: vine.number().optional(),
//     status: vine.string(),
//     statusUpdatedAt: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(), // ISO string date
//     comment: vine.string().optional(),
//   })
// )

// export const mergeRecruitmentsValidator = vine.compile(
//   vine.object({
//     recruitmentId1: vine.number(),
//     recruitmentId2: vine.number(),
//     firstName: vine.string().optional(),
//     lastName: vine.string().optional(),
//     contactDate: vine.string().optional(),
//     contactedBy: vine.number().optional(),
//     status: vine.string().optional(),
//     statusUpdatedAt: vine.string().optional(),
//     comment: vine.string().optional(),
//   })
// )

// import vine from '@vinejs/vine'
// import { DateTime } from 'luxon'

// /**
//  * Validates creation of a recruitment entry
//  */
// export const createRecruitmentValidator = vine.compile(
//   vine.object({
//     id: vine.number().optional(),
//     firstName: vine.string(),
//     lastName: vine.string(),
//     contactDate: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(),
//     contactedBy: vine.number().optional(), // contactBy should be a number (likely user ID)
//     status: vine.string(),
//     statusUpdatedAt: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(),
//     comment: vine.string().optional(),
//   })
// )

// /**
//  * Validates merging two recruitment records
//  */
// export const mergeRecruitmentsValidator = vine.compile(
//   vine.object({
//     recruitmentId1: vine.number(),
//     recruitmentId2: vine.number(),
//     firstName: vine.string().optional(),
//     lastName: vine.string().optional(),
//     contactDate: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(),
//     contactedBy: vine.number().optional(),
//     status: vine.string().optional(),
//     statusUpdatedAt: vine
//       .string()
//       .transform((val) => DateTime.fromISO(val))
//       .optional(),
//     comment: vine.string().optional(),
//   })
// )

import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * Validates creation of a recruitment entry
 */
export const createRecruitmentValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim(),
    lastName: vine.string().trim(),
    sectionGroupId: vine.number(), // Corrected: Remove .notNullable()
    contactDate: vine
      .string() // Expecting an ISO string date for provided values
      .transform((val) => (val ? DateTime.fromISO(val) : null)) // Transform to DateTime or null
      .optional() // Field can be omitted
      .nullable(),

    contactedBy: vine.number().optional().nullable(), // Corrected: Remove .notNullable()
    status: vine.enum([
      'not yet contacted', // ADDED
      'awaiting response',
      'interested',
      'participating',
      'registered',
      'not available',
      'to follow up', // CHANGED from 'to be contacted'
      'cancelled',
      'other',
    ]), // Corrected: Remove .notNullable()
    comment: vine.string().trim().optional().nullable(), // .nullable() if null is acceptable AND optional() if the field itself can be missing
  })
)

export const updateRecruitmentValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().optional(),
    lastName: vine.string().trim().optional(),
    sectionGroupId: vine.number().optional(),

    contactDate: vine
      .string()
      .transform((val) => (val ? DateTime.fromISO(val) : null))
      .optional()
      .nullable(),

    contactedBy: vine.number().optional().nullable(),

    status: vine
      .enum([
        'not yet contacted',
        'awaiting response',
        'interested',
        'participating',
        'registered',
        'not available',
        'to follow up',
        'cancelled',
        'other',
      ])
      .optional(), // Status itself is optional for update

    comment: vine.string().trim().optional().nullable(),
  })
)

export const mergeRecruitmentsValidator = vine.compile(
  vine.object({
    recruitmentId1: vine.number(), // Corrected: Remove .notNullable() - implicit for required fields
    recruitmentId2: vine.number(), // Corrected: Remove .notNullable() - implicit for required fields
    firstName: vine.string().trim().optional(),
    lastName: vine.string().trim().optional(),
    contactDate: vine
      .string()
      .transform((val) => (val ? DateTime.fromISO(val) : null))
      .optional()
      .nullable(),
    contactedBy: vine.number().optional().nullable(),
    status: vine
      .enum([
        'not yet contacted', // ADDED
        'awaiting response',
        'interested',
        'participating',
        'registered',
        'not available',
        'to follow up', // CHANGED from 'to be contacted'
        'cancelled',
        'other',
      ])
      .optional(),
    statusUpdatedAt: vine
      .string()
      .transform((val) => DateTime.fromISO(val))
      .optional(),
    comment: vine.string().trim().optional().nullable(),
  })
)
