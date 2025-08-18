import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'

export default class RecruitmentSettings extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare follow_up_days: number

  @column()
  declare auto_follow_up_enabled: boolean

  @column()
  declare auto_import_enabled: boolean

  @column.dateTime()
  declare last_auto_import: DateTime | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  shouldAutoImport(): boolean {
    if (!this.auto_import_enabled) return false

    if (!this.last_auto_import) return true

    const daysSinceLastImport = DateTime.now().diff(this.last_auto_import, 'days').days
    return daysSinceLastImport >= 1
  }

  async markAutoImportPerformed() {
    this.last_auto_import = DateTime.now()
    await this.save()
  }

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      follow_up_days: Number(this.follow_up_days),
      auto_follow_up_enabled: Boolean(this.auto_follow_up_enabled),
      auto_import_enabled: Boolean(this.auto_import_enabled || false),
      last_auto_import: this.last_auto_import && this.last_auto_import.isValid
        ? this.last_auto_import.toISO()
        : null,
      created_at: this.createdAt && this.createdAt.isValid
        ? this.createdAt.toISO()
        : null,
      updated_at: this.updatedAt && this.updatedAt.isValid
        ? this.updatedAt.toISO()
        : null,
    }
  }

  static async getOrCreateForProject(projectId: number): Promise<RecruitmentSettings> {
    let settings = await this.query().where('project_id', projectId).first()

    if (!settings) {
      settings = await this.create({
        project_id: projectId,
        follow_up_days: 7,
        auto_follow_up_enabled: true,
        auto_import_enabled: false,
      })
    }

    return settings
  }

  static getValidationRules() {
    return {
      follow_up_days: {
        min: 1,
        max: 30,
        type: 'number'
      },
      auto_follow_up_enabled: {
        type: 'boolean'
      },
      auto_import_enabled: {
        type: 'boolean'
      }
    }
  }

  isValidFollowUpDays(days: number): boolean {
    return Number.isInteger(days) && days >= 1 && days <= 30
  }

  updateFollowUpSettings(followUpDays: number, autoFollowUpEnabled: boolean): boolean {
    if (!this.isValidFollowUpDays(followUpDays)) {
      return false
    }

    this.follow_up_days = followUpDays
    this.auto_follow_up_enabled = Boolean(autoFollowUpEnabled)
    return true
  }
}
