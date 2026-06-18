import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import Contact from './contact.js'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import MailTemplate from './mail_template.js'
import Organization from '#models/organization'

export default class List extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @manyToMany(() => Contact, {
    pivotTable: 'contacts_lists',
    pivotTimestamps: true,
  })
  declare contacts: ManyToMany<typeof Contact>

  @hasMany(() => MailTemplate)
  declare mail_templates: HasMany<typeof MailTemplate>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
declare organizationId: number | null

@belongsTo(() => Organization)
declare organization: BelongsTo<typeof Organization>
}
