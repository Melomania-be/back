import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import Contact from './contact.js'
import Section from './section.js'

export type RecruitmentStatus = string
export type ContactMethod = 'manual' | 'email' | 'messenger' | 'phone'

export default class RecruitmentContact extends TenantModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare contact_id: number | null

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare messenger: string | null

  @column()
  declare section_id: number | null

  @column()
  declare status: string

  @column()
  declare contact_method: ContactMethod

  @column.dateTime()
  declare contact_date: DateTime | null

  @column.dateTime()
  declare last_follow_up: DateTime | null

  @column()
  declare notes: string | null

  @column()
  declare recommended_by: string | null

  @column()
  declare recommender_contact_id: number | null

  @column()
  declare is_duplicate: boolean

  @column()
  declare source: string | null

  @column()
  declare contacted_by: string | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => Contact, {
    foreignKey: 'recommender_contact_id',
  })
  declare recommender: BelongsTo<typeof Contact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  shouldFollowUp(followUpDays: number): boolean {
    if (this.status !== 'awaiting_response' || !this.contact_date) {
      return false
    }

    if (!this.contact_date.isValid) {
      return false
    }

    const daysSinceContact = DateTime.now().diff(this.contact_date, 'days').days
    return daysSinceContact >= followUpDays
  }

  get displayName(): string {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim()
  }

  get primaryContact(): string {
    return this.email || this.messenger || this.phone || 'No contact'
  }

  private formatDateSafely(date: DateTime | null): string | null {
    if (!date) return null

    try {
      if (!date.isValid) return null
      return date.toFormat('dd/MM/yyyy HH:mm')
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
      first_name: this.first_name || '',
      last_name: this.last_name || '',
      display_name: this.displayName,
      primary_contact: this.primaryContact,
      contacted_by: this.contacted_by || null,

      contact_date: this.formatDateSafely(this.contact_date),
      contact_date_iso: this.formatDateTimeToISO(this.contact_date),
      last_follow_up: this.formatDateSafely(this.last_follow_up),
      last_follow_up_iso: this.formatDateTimeToISO(this.last_follow_up),
      created_at: this.formatDateSafely(this.createdAt),
      created_at_iso: this.formatDateTimeToISO(this.createdAt),
      updated_at: this.formatDateSafely(this.updatedAt),
      updated_at_iso: this.formatDateTimeToISO(this.updatedAt),

      section: this.section
        ? {
            id: this.section.id,
            name: this.section.name || 'Unknown section',
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

      recommender: this.recommender
        ? {
            id: this.recommender.id,
            first_name: this.recommender.first_name || '',
            last_name: this.recommender.last_name || '',
          }
        : null,
    }
  }

  getDaysSinceContact(): number | null {
    if (!this.contact_date || !this.contact_date.isValid) return null
    return Math.floor(DateTime.now().diff(this.contact_date, 'days').days)
  }

  needsFollowUp(followUpDays: number): boolean {
    return this.shouldFollowUp(followUpDays)
  }

  getStatusBadge(): { label: string; color: string; icon: string } {
    const statusConfig = {
      not_yet_contacted: { label: 'Not yet contacted', color: 'gray', icon: 'AlertCircle' },
      awaiting_response: { label: 'Awaiting response', color: 'blue', icon: 'Clock' },
      to_follow_up: { label: 'Follow up', color: 'yellow', icon: 'AlertTriangle' },
      not_available: { label: 'Not available', color: 'red', icon: 'XCircle' },
      pending_validation: { label: 'Pending validation', color: 'purple', icon: 'Clock' },
      cancelled: { label: 'Cancelled', color: 'red', icon: 'XCircle' },
      recruited: { label: 'Recruited', color: 'green', icon: 'CheckCircle' },
    }

    return (
      statusConfig[this.status as keyof typeof statusConfig] || {
        label: this.status,
        color: 'gray',
        icon: 'Circle',
      }
    )
  }

  static getAvailableStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'not_yet_contacted', label: 'Not yet contacted' },
      { value: 'awaiting_response', label: 'Awaiting response' },
      { value: 'to_follow_up', label: 'Follow up' },
      { value: 'not_available', label: 'Not available' },
      { value: 'pending_validation', label: 'Pending validation' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'recruited', label: 'Recruited' },
    ]
  }

  static getAvailableContactMethods(): Array<{ value: ContactMethod; label: string }> {
    return [
      { value: 'manual', label: 'Manual' },
      { value: 'email', label: 'Email' },
      { value: 'messenger', label: 'Messenger' },
      { value: 'phone', label: 'Phone' },
    ]
  }

  async markAsContacted(method: ContactMethod = 'manual'): Promise<void> {
    this.status = 'awaiting_response'
    this.contact_method = method
    this.contact_date = DateTime.now()
    await this.save()
  }

  async markAsRecruited(): Promise<void> {
    this.status = 'recruited'
    await this.save()
  }

  async markAsNotAvailable(): Promise<void> {
    this.status = 'not_available'
    await this.save()
  }

  async markForFollowUp(): Promise<void> {
    this.status = 'to_follow_up'
    this.last_follow_up = DateTime.now()
    await this.save()
  }

  async markAsCancelled(): Promise<void> {
    this.status = 'cancelled'
    await this.save()
  }

  isContactable(): boolean {
    return !!(this.email || this.phone || this.messenger)
  }

  hasValidEmail(): boolean {
    if (!this.email) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(this.email)
  }

  canBeContacted(): boolean {
    return this.status === 'not_yet_contacted' || this.status === 'to_follow_up'
  }

  isInProgress(): boolean {
    return this.status === 'awaiting_response' || this.status === 'to_follow_up'
  }

  isCompleted(): boolean {
    return (
      this.status === 'recruited' || this.status === 'not_available' || this.status === 'cancelled'
    )
  }

  updateContactedBy(contactedBy: string): void {
    this.contacted_by = contactedBy
  }

  addNotes(notes: string): void {
    this.notes = notes
  }

  static async updateFollowUpStatuses(projectId: number, followUpDays: number): Promise<number> {
    const contactsToUpdate = await this.query()
      .where('project_id', projectId)
      .where('status', 'awaiting_response')
      .whereNotNull('contact_date')

    let updatedCount = 0
    for (const contact of contactsToUpdate) {
      if (contact.shouldFollowUp(followUpDays)) {
        contact.status = 'to_follow_up'
        await contact.save()
        updatedCount++
      }
    }

    return updatedCount
  }

  static async findDuplicatesInProject(
    projectId: number,
    firstName: string,
    lastName: string,
    email?: string
  ): Promise<RecruitmentContact[]> {
    const query = this.query().where('project_id', projectId)

    if (email) {
      query.orWhere('email', email)
    }

    query.orWhere((subQuery) => {
      subQuery
        .where('first_name', 'ilike', `%${firstName}%`)
        .where('last_name', 'ilike', `%${lastName}%`)
    })

    return await query
  }

  static async markAsCancelledByContactId(projectId: number, contactId: number): Promise<boolean> {
    try {
      const contact = await this.query()
        .where('project_id', projectId)
        .where('contact_id', contactId)
        .first()

      if (contact) {
        contact.status = 'cancelled'
        await contact.save()
        return true
      }

      return false
    } catch (error) {
      console.error('Error marking contact as cancelled:', error)
      return false
    }
  }
}
