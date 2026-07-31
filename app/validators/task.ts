import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export const createTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(2),
    description: vine.string().trim().optional(),
    status: vine.enum(['todo', 'in_progress', 'done']).optional(),
    priority: vine.enum(['low', 'medium', 'high']).optional(),
    taskType: vine.enum(['logistic', 'musical', 'administrative', 'communication']).optional(),
    visibility: vine.enum(['private', 'section', 'all']).optional(),

    dueDate: vine.date().nullable().optional().transform((value) => value ? DateTime.fromJSDate(value) : null),

    isRecurring: vine.boolean().optional(),
    recurrenceRule: vine.string().optional(),

    // 👇 On retire les .nullable() de projectId car le Modèle ne les accepte pas
    projectId: vine.number().optional(),
    eventId: vine.number().optional().nullable(),
    pieceId: vine.number().optional().nullable(),
    sectionId: vine.number().optional().nullable(),
    assigneeId: vine.number().optional().nullable(),
  })
)

export const updateTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(2).optional(),
    description: vine.string().trim().optional().nullable(),
    status: vine.enum(['todo', 'in_progress', 'done']).optional(),
    priority: vine.enum(['low', 'medium', 'high']).optional(),
    taskType: vine.enum(['logistic', 'musical', 'administrative', 'communication']).optional(),
    visibility: vine.enum(['private', 'section', 'all']).optional(),

    dueDate: vine.date().nullable().optional().transform((value) => value ? DateTime.fromJSDate(value) : null),

    isRecurring: vine.boolean().optional(),
    recurrenceRule: vine.string().optional().nullable(),

    // 👇 Pareil ici, on retire .nullable()
    projectId: vine.number().optional(),
    eventId: vine.number().optional().nullable(),
    pieceId: vine.number().optional().nullable(),
    sectionId: vine.number().optional().nullable(),
    assigneeId: vine.number().optional().nullable(),
  })
)