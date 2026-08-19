import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import Contact from './contact.js'
import AccountingCategory from './accounting_category.js'
import Organization from '#models/organization'

import ContractorContact from './contractor_contact.js'

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type EntryType = 'expense' | 'income'

export default class AccountingEntry extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare contact_id: number | null

@column()
declare contractor_contact_id: number | null

  @column()
  declare category_id: number | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare amount: number

  @column()
  declare entry_type: EntryType

  @column()
  declare payment_status: PaymentStatus

  @column.date()
  declare bill_date: DateTime | null

  @column.date()
  declare payment_date: DateTime | null

  @column.date()
  declare due_date: DateTime | null

  @column()
  declare attachment: string | null

  @column()
  declare is_individual_payment: boolean

  @column()
  declare is_musician_fee: boolean

  @column()
  declare invoice_number: string | null

  @column()
  declare notes: string | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => ContractorContact, {
  foreignKey: 'contractor_contact_id',
})
declare contractor: BelongsTo<typeof ContractorContact>

  @belongsTo(() => AccountingCategory, {
    foreignKey: 'category_id',
  })
  declare category: BelongsTo<typeof AccountingCategory>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
declare organizationId: number | null

@belongsTo(() => Organization)
declare organization: BelongsTo<typeof Organization>

  isOverdue(): boolean {
    if (this.payment_status === 'paid' || !this.due_date) {
      return false
    }

    if (!this.due_date.isValid) {
      return false
    }

    return DateTime.now() > this.due_date
  }

  get displayName(): string {
    return this.name || 'Sans nom'
  }

  get statusLabel(): string {
    const statusLabels = {
      pending: 'En attente',
      paid: 'Payé',
      overdue: 'En retard',
      cancelled: 'Annulé',
    }
    return statusLabels[this.payment_status] || 'Inconnu'
  }

  private formatDateSafely(date: DateTime | null): string | null {
    if (!date) return null

    try {
      if (!date.isValid) return null
      return date.toFormat('yyyy-MM-dd')
    } catch (error) {
      console.error('Error formatting date:', error)
      return null
    }
  }

  private formatDateTimeToISO(date: DateTime | null): string | null {
    if (!date) return null

    try {
      if (!date.isValid) return null
      return date.toISO()
    } catch (error) {
      console.error('Error formatting date to ISO:', error)
      return null
    }
  }

  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      name: this.name || '',
      description: this.description || null,
      amount: Number(this.amount),
      entry_type: this.entry_type,
      payment_status: this.payment_status,
      status_label: this.statusLabel,
      is_overdue: this.isOverdue(),

      bill_date: this.formatDateSafely(this.bill_date),
      bill_date_iso: this.formatDateTimeToISO(this.bill_date),
      payment_date: this.formatDateSafely(this.payment_date),
      payment_date_iso: this.formatDateTimeToISO(this.payment_date),
      due_date: this.formatDateSafely(this.due_date),
      due_date_iso: this.formatDateTimeToISO(this.due_date),
      created_at: this.formatDateSafely(this.createdAt),
      created_at_iso: this.formatDateTimeToISO(this.createdAt),
      updated_at: this.formatDateSafely(this.updatedAt),
      updated_at_iso: this.formatDateTimeToISO(this.updatedAt),

      category: this.category
        ? {
            id: this.category.id,
            name: this.category.name || 'Catégorie inconnue',
            color: this.category.color || null,
          }
        : null,

      contact: this.contact
        ? {
            id: this.contact.id,
            first_name: this.contact.first_name || '',
            last_name: this.contact.last_name || '',
            email: this.contact.email || null,
          }
        : null,

        contractor_contact_id: this.contractor_contact_id,

contractor: this.contractor
  ? {
      id: this.contractor.id,
      firstName: this.contractor.first_name,
      lastName: this.contractor.last_name,
    }
  : null,
    }
  }

  getStatusBadge(): { label: string; color: string; icon: string } {
    const statusConfig = {
      pending: { label: 'En attente', color: 'yellow', icon: 'Clock' },
      paid: { label: 'Payé', color: 'green', icon: 'CheckCircle' },
      overdue: { label: 'En retard', color: 'red', icon: 'AlertTriangle' },
      cancelled: { label: 'Annulé', color: 'gray', icon: 'XCircle' },
    }

    return statusConfig[this.payment_status] || statusConfig['pending']
  }

  static getAvailableStatuses(): Array<{ value: PaymentStatus; label: string }> {
    return [
      { value: 'pending', label: 'En attente' },
      { value: 'paid', label: 'Payé' },
      { value: 'overdue', label: 'En retard' },
      { value: 'cancelled', label: 'Annulé' },
    ]
  }

  static getAvailableEntryTypes(): Array<{ value: EntryType; label: string }> {
    return [
      { value: 'expense', label: 'Dépense' },
      { value: 'income', label: 'Revenu' },
    ]
  }

  async markAsPaid(): Promise<void> {
    this.payment_status = 'paid'
    this.payment_date = DateTime.now()
    await this.save()
  }

  async markAsPending(): Promise<void> {
    this.payment_status = 'pending'
    await this.save()
  }

  async markAsCancelled(): Promise<void> {
    this.payment_status = 'cancelled'
    await this.save()
  }

  canBeMarkedAsPaid(): boolean {
    return this.payment_status === 'pending' || this.payment_status === 'overdue'
  }

  static async updateOverdueStatuses(projectId: number): Promise<number> {
    const entriesToUpdate = await this.query()
      .where('project_id', projectId)
      .where('payment_status', 'pending')
      .whereNotNull('due_date')

    let updatedCount = 0
    for (const entry of entriesToUpdate) {
      if (entry.isOverdue()) {
        entry.payment_status = 'overdue'
        await entry.save()
        updatedCount++
      }
    }

    return updatedCount
  }

  static async getProjectStats(projectId: number) {
    const entries = await this.query().where('project_id', projectId)

    const stats = {
      total_entries: entries.length,
      total_expenses: 0,
      total_income: 0,
      total_pending: 0,
      total_paid: 0,
      total_overdue: 0,
      by_category: {} as Record<string, number>,
    }

    for (const entry of entries) {
      if (entry.entry_type === 'expense') {
        stats.total_expenses += Number(entry.amount)
      } else {
        stats.total_income += Number(entry.amount)
      }

      if (entry.payment_status === 'pending') {
        stats.total_pending += Number(entry.amount)
      } else if (entry.payment_status === 'paid') {
        stats.total_paid += Number(entry.amount)
      } else if (entry.payment_status === 'overdue') {
        stats.total_overdue += Number(entry.amount)
      }
    }

    return stats
  }
}