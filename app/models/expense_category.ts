import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * @deprecated Use AccountingCategory instead
 * This model is kept for backward compatibility only
 */
export default class ExpenseCategory extends BaseModel {
  static table = 'accounting_categories'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description?: string | null

  @column({ columnName: 'is_default' })
  declare isDefault: boolean

  @column()
  declare color?: string | null

  @column()
  declare icon?: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
