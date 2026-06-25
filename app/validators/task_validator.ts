import vine from '@vinejs/vine'

export const createTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    status: vine.enum(['todo', 'in_progress', 'done']).optional(),
    projectId: vine.number().positive(),
    assignedTo: vine.number().positive().optional()
  })
)

export const updateTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional(),
    status: vine.enum(['todo', 'in_progress', 'done']).optional(),
    assignedTo: vine.number().positive().optional()
  })
)
