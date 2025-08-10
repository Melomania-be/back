// app/models/recruitment_recommendation.ts - Version complète corrigée
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import RecruitmentContact from './recruitment_contact.js'

export type RecommendationStatus = 'pending' | 'ignored' | 'contact_email' | 'contact_manual'

export default class RecruitmentRecommendation extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare recommender_name: string

  @column()
  declare recommender_email: string | null

  @column()
  declare recommended_first_name: string

  @column()
  declare recommended_last_name: string

  @column()
  declare recommended_email: string | null

  @column()
  declare recommended_phone: string | null

  @column()
  declare recommended_messenger: string | null

  @column()
  declare recommended_instrument: string | null

  @column()
  declare recommendation_message: string | null

  // ✅ CORRECTION : Valeur par défaut pour le statut avec sérialisation sécurisée
  @column({
    prepare: (value: RecommendationStatus | string | null | undefined) => {
      if (!value || typeof value !== 'string') return 'pending'
      const validStatuses: RecommendationStatus[] = ['pending', 'ignored', 'contact_email', 'contact_manual']
      return validStatuses.includes(value as RecommendationStatus) ? value : 'pending'
    },
    serialize: (value: RecommendationStatus | string | null | undefined) => {
      return value || 'pending'
    }
  })
  declare status: RecommendationStatus

  @column()
  declare recruitment_contact_id: number | null

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => RecruitmentContact, {
    foreignKey: 'recruitment_contact_id',
  })
  declare recruitmentContact: BelongsTo<typeof RecruitmentContact>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ✅ GETTERS : Propriétés calculées sécurisées

  /**
   * Nom d'affichage sécurisé de la personne recommandée
   */
  get recommendedDisplayName(): string {
    const firstName = this.recommended_first_name?.trim() || 'Prénom'
    const lastName = this.recommended_last_name?.trim() || 'Nom'
    return `${firstName} ${lastName}`.trim()
  }

  /**
   * Nom du recommandeur sécurisé
   */
  get recommenderDisplayName(): string {
    return this.recommender_name?.trim() || 'Recommandeur anonyme'
  }

  /**
   * Formatage de date de création sécurisé
   */
  get formattedCreatedAt(): string {
    if (!this.createdAt) return 'Date inconnue'

    try {
      return this.createdAt.toFormat('dd/MM/yyyy à HH:mm')
    } catch (error) {
      console.error('Error formatting createdAt:', error)
      return 'Date invalide'
    }
  }

  /**
   * Formatage de date de mise à jour sécurisé
   */
  get formattedUpdatedAt(): string {
    if (!this.updatedAt) return 'Date inconnue'

    try {
      return this.updatedAt.toFormat('dd/MM/yyyy à HH:mm')
    } catch (error) {
      console.error('Error formatting updatedAt:', error)
      return 'Date invalide'
    }
  }

  /**
   * Vérifier si la recommandation a des informations de contact
   */
  get hasContactInfo(): boolean {
    return !!(this.recommended_email || this.recommended_phone || this.recommended_messenger)
  }

  /**
   * Obtenir le moyen de contact principal
   */
  get primaryContact(): string {
    if (this.recommended_email) return this.recommended_email
    if (this.recommended_phone) return this.recommended_phone
    if (this.recommended_messenger) return this.recommended_messenger
    return 'Aucun contact'
  }

  /**
   * Vérifier si la recommandation peut être contactée par email
   */
  get canContactByEmail(): boolean {
    return !!(this.recommended_email && this.recommended_email.includes('@'))
  }

  // ✅ MÉTHODES : Utilitaires

  /**
   * Marquer la recommandation comme ignorée
   */
  async markAsIgnored(): Promise<void> {
    this.status = 'ignored'
    await this.save()
  }

  /**
   * Marquer la recommandation comme contactée par email
   */
  async markAsContactedByEmail(recruitmentContactId?: number): Promise<void> {
    this.status = 'contact_email'
    if (recruitmentContactId) {
      this.recruitment_contact_id = recruitmentContactId
    }
    await this.save()
  }

  /**
   * Marquer la recommandation comme contactée manuellement
   */
  async markAsContactedManually(recruitmentContactId?: number): Promise<void> {
    this.status = 'contact_manual'
    if (recruitmentContactId) {
      this.recruitment_contact_id = recruitmentContactId
    }
    await this.save()
  }

  // ✅ SÉRIALISATION : Méthode personnalisée pour corriger les valeurs undefined
  serialize() {
    const baseData = super.serialize()

    return {
      ...baseData,
      // ✅ Protection contre les valeurs undefined/null
      id: this.id || 0,
      project_id: this.project_id || 0,
      recommender_name: this.recommender_name || 'Anonyme',
      recommender_email: this.recommender_email || null,
      recommended_first_name: this.recommended_first_name || 'Prénom',
      recommended_last_name: this.recommended_last_name || 'Nom',
      recommended_email: this.recommended_email || null,
      recommended_phone: this.recommended_phone || null,
      recommended_messenger: this.recommended_messenger || null,
      recommended_instrument: this.recommended_instrument || null,
      recommendation_message: this.recommendation_message || null,
      status: this.status || 'pending',
      recruitment_contact_id: this.recruitment_contact_id || null,

      // ✅ Propriétés calculées
      recommended_display_name: this.recommendedDisplayName,
      recommender_display_name: this.recommenderDisplayName,
      has_contact_info: this.hasContactInfo,
      primary_contact: this.primaryContact,
      can_contact_by_email: this.canContactByEmail,

      // ✅ Dates formatées
      formatted_created_at: this.formattedCreatedAt,
      formatted_updated_at: this.formattedUpdatedAt,

      // ✅ Dates au format ISO pour JavaScript
      created_at: this.createdAt ? this.createdAt.toFormat('yyyy-MM-dd HH:mm:ss') : null,
      updated_at: this.updatedAt ? this.updatedAt.toFormat('yyyy-MM-dd HH:mm:ss') : null,
      created_at_iso: this.createdAt ? this.createdAt.toISO() : null,
      updated_at_iso: this.updatedAt ? this.updatedAt.toISO() : null,
    }
  }

  // ✅ MÉTHODES STATIQUES : Utilitaires de classe

  /**
   * Obtenir toutes les recommandations en attente pour un projet
   */
  static async getPendingForProject(projectId: number) {
    return await this.query()
      .where('project_id', projectId)
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
  }

  /**
   * Obtenir le nombre de recommandations en attente pour un projet
   */
  static async getPendingCountForProject(projectId: number): Promise<number> {
    const result = await this.query()
      .where('project_id', projectId)
      .where('status', 'pending')
      .count('* as total')
      .first()

    return Number(result?.$extras.total || 0)
  }

  /**
   * Obtenir toutes les recommandations pour un projet avec leurs relations
   */
  static async getForProjectWithRelations(projectId: number) {
    return await this.query()
      .where('project_id', projectId)
      .preload('project')
      .preload('recruitmentContact', (query) => {
        query.preload('contact').preload('section')
      })
      .orderBy('created_at', 'desc')
  }

  /**
   * Rechercher des recommandations par nom
   */
  static async searchByName(projectId: number, searchTerm: string) {
    const term = `%${searchTerm.toLowerCase()}%`

    return await this.query()
      .where('project_id', projectId)
      .andWhere((query) => {
        query
          .whereRaw('LOWER(recommended_first_name) LIKE ?', [term])
          .orWhereRaw('LOWER(recommended_last_name) LIKE ?', [term])
          .orWhereRaw('LOWER(recommender_name) LIKE ?', [term])
      })
      .orderBy('created_at', 'desc')
  }
}
