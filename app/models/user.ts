import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export type UserRole = 'superadmin' | 'user' | 'guest'

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column()
  declare password: string

  // ✅ NOUVEAU : rôle de l'utilisateur
  @column()
  declare role: UserRole

  // ✅ NOUVEAU : permissions granulaires
  @column()
  declare canAccessContacts: boolean

  @column()
  declare canExportContacts: boolean

  @column()
  declare isActive: boolean

  // ✅ NOUVEAU : projets accessibles pour les guests
  @manyToMany(() => Project, {
    pivotTable: 'user_project_access',
  })
  declare accessibleProjects: ManyToMany<typeof Project>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  // ✅ Helpers de vérification de rôle
  get isSuperAdmin(): boolean {
    return this.role === 'superadmin'
  }

  get isGuest(): boolean {
    return this.role === 'guest'
  }

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })
}
