import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AppSettings extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare logo_path: string | null

  @column()
  declare logo_file_name: string | null

  @column()
  declare background_image_path: string | null

  @column()
  declare background_file_name: string | null

  @column()
  declare primary_color: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async getOrCreate(): Promise<AppSettings> {
    let settings = await this.first()
    if (!settings) {
      settings = await this.create({ primary_color: '#343CAD' })
    }
    return settings
  }

  serialize() {
    return {
      id: this.id,
      primary_color: this.primary_color || '#343CAD',
      logo_file_name: this.logo_file_name,
      background_file_name: this.background_file_name,
      has_logo: !!this.logo_path,
      has_background: !!this.background_image_path,
    }
  }
}
