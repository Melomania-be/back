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
      .string() // Expecting an ISO string date
      .transform((val) => DateTime.fromISO(val)), // Corrected: Remove .notNullable()
    contactedBy: vine.number(), // Corrected: Remove .notNullable()
    status: vine.enum([
      // Enforce specific status values
      'awaiting response',
      'interested',
      'participating',
      'registered',
      'not available',
      'to be contacted',
      'cancelled',
      'other',
      'withdrawn',
    ]), // Corrected: Remove .notNullable()
    comment: vine.string().trim().optional().nullable(), // .nullable() if null is acceptable AND optional() if the field itself can be missing
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
      .transform((val) => DateTime.fromISO(val))
      .optional(),
    contactedBy: vine.number().optional(),
    status: vine
      .enum([
        // Enforce specific status values even if optional
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
    statusUpdatedAt: vine
      .string()
      .transform((val) => DateTime.fromISO(val))
      .optional(),
    comment: vine.string().trim().optional().nullable(),
  })
)
