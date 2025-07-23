import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ExpenseCategory from '#models/expense_category'
import Project from '#models/project'
import Contact from '#models/contact'

export default class Accounting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.date()
  declare bill_date: DateTime | null

  @column.date()
  declare payment_date: DateTime | null

  @column()
  declare name: string

  @column()
  declare amount: number

  @column()
  declare attachment: string | null

  @column()
  declare category_id: number

  @column()
  declare project_id: number

  @column()
  declare contact_id: number | null

  @belongsTo(() => ExpenseCategory, {
    foreignKey: 'category_id',
  })
  declare category: BelongsTo<typeof ExpenseCategory>

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare is_individual_payment : boolean

  @column()
  declare is_musician_fee : boolean
}
