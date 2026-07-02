import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Task extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Clé étrangère vers l'utilisateur
  @column()
  declare userId: number | null

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare status: string

  // Nouvelle colonne de priorité
  @column()
  declare priority: string

  @column.dateTime()
  declare dueDate: DateTime | null

  // Colonne pour la corbeille (Soft Delete)
  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- RELATIONS ---
  // Une tâche appartient à un utilisateur
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
