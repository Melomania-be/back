// app/models/shared_folder.ts
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Folder from './folder.js'

export default class SharedFolder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare folder_id: number

  @column()
  declare token: string

  @column()
  declare view_count: number

  @column()
  declare is_active: boolean

  @column.dateTime()
  declare expires_at: DateTime | null

  @belongsTo(() => Folder, {
    foreignKey: 'folder_id',
  })
  declare folder: BelongsTo<typeof Folder>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  isValid(): boolean {
    if (!this.is_active) return false
    if (this.expires_at && this.expires_at < DateTime.now()) return false
    return true
  }

  async incrementViews(): Promise<void> {
    this.view_count += 1
    await this.save()
  }

  async deactivate(): Promise<void> {
    this.is_active = false
    await this.save()
  }
}
