import { DateTime } from 'luxon'
import { column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import TenantModel from '#models/tenant_model'
import Contact from './contact.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import MailTemplate from './mail_template.js'

export default class List extends TenantModel {
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
}
