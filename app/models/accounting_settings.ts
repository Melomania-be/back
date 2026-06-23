import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'

export default class AccountingSettings extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare currency: string

  @column()
  declare auto_overdue_enabled: boolean

  @column()
  declare default_payment_terms: number

  @column()
  declare tax_rate: number

  @column()
  declare enable_tax: boolean

  @column.dateTime()
  declare fiscal_year_start: DateTime | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      currency: this.currency || 'EUR',
      auto_overdue_enabled: Boolean(this.auto_overdue_enabled),
      default_payment_terms: Number(this.default_payment_terms),
      tax_rate: Number(this.tax_rate),
      enable_tax: Boolean(this.enable_tax),
      fiscal_year_start:
        this.fiscal_year_start && this.fiscal_year_start.isValid
          ? this.fiscal_year_start.toISO()
          : null,
      created_at: this.createdAt && this.createdAt.isValid ? this.createdAt.toISO() : null,
      updated_at: this.updatedAt && this.updatedAt.isValid ? this.updatedAt.toISO() : null,
    }
  }

  static async getOrCreateForProject(projectId: number): Promise<AccountingSettings> {
    let settings = await this.query().where('project_id', projectId).first()

    if (!settings) {
      settings = await this.create({
        project_id: projectId,
        currency: 'EUR',
        auto_overdue_enabled: true,
        default_payment_terms: 30,
        tax_rate: 20.0,
        enable_tax: false,
        fiscal_year_start: null,
      })
    }

    return settings
  }

  static getValidationRules() {
    return {
      default_payment_terms: {
        min: 0,
        max: 365,
        type: 'number',
      },
      tax_rate: {
        min: 0,
        max: 100,
        type: 'number',
      },
      auto_overdue_enabled: {
        type: 'boolean',
      },
      enable_tax: {
        type: 'boolean',
      },
    }
  }

  isValidPaymentTerms(days: number): boolean {
    return Number.isInteger(days) && days >= 0 && days <= 365
  }

  isValidTaxRate(rate: number): boolean {
    return !Number.isNaN(rate) && rate >= 0 && rate <= 100
  }
}
