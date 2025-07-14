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

    // --- NEW FIELD: projectId ---
    projectId: vine.number().optional().nullable(), // Allow projectId to be optional and nullable
    // --- END NEW FIELD ---

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

    // --- NEW FIELD: projectId ---
    projectId: vine.number().optional().nullable(), // Allow projectId to be optional and nullable for updates
    // --- END NEW FIELD ---

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

    // --- NEW FIELD: projectId ---
    projectId: vine.number().optional().nullable(), // Allow projectId to be optional and nullable for merges
    // --- END NEW FIELD ---

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
