import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ExpenseCategory from '#models/expense_category'
import Project from '#models/project'
import Contact from '#models/contact'

/**
 * @deprecated Use AccountingEntry instead
 * This model is kept for backward compatibility only
 */
export default class Accounting extends BaseModel {
  // Définir le nom de la table de manière statique
  static table = 'accounting_entries'

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
  declare category_id: number | null

  @column()
  declare project_id: number

  @column()
  declare contact_id: number | null

  @column()
  declare is_individual_payment: boolean

  @column()
  declare is_musician_fee: boolean

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

  serializeExtras() {
    return {}
  }

  serialize(): Record<string, unknown> {
    return {
      id: this.id,
      billDate: this.bill_date ? this.bill_date.toFormat('yyyy-MM-dd') : null,
      paymentDate: this.payment_date ? this.payment_date.toFormat('yyyy-MM-dd') : null,
      name: this.name,
      amount: Number(this.amount),
      attachment: this.attachment,
      categoryId: this.category_id,
      projectId: this.project_id,
      contactId: this.contact_id,
      isIndividualPayment: Boolean(this.is_individual_payment),
      isMusicianFee: Boolean(this.is_musician_fee),
      createdAt: this.createdAt ? this.createdAt.toISO() : null,
      updatedAt: this.updatedAt ? this.updatedAt.toISO() : null,
    }
  }
}
