// app/controllers/recruitment_recommendation_controller.ts - Version complète corrigée
import { HttpContext } from '@adonisjs/core/http'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Project from '#models/project'
import vine from '@vinejs/vine'
import env from '#start/env'

export default class RecruitmentRecommendationController {
  /**
   * ✅ CORRECTION : Page publique de recommandation qui redirige vers le frontend
   */
  async getRecommendationPage({ params, response }: HttpContext) {
    try {
      console.log('🔍 Accessing recommendation page for project:', params.id)

      // Vérifier que le projet existe
      const project = await Project.findOrFail(params.id)
      console.log('✅ Project found:', project.name)

      // ✅ SOLUTION : Rediriger vers le frontend Svelte au lieu de rendre une vue Edge
      const frontendUrl = this.getFrontendUrl()
      const redirectUrl = `${frontendUrl}/projects/${params.id}/recommend`

      console.log('🔄 Redirecting to frontend:', redirectUrl)
      return response.redirect(redirectUrl)
    } catch (error) {
      console.error('❌ Error in recommendation page:', error)

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({
          error: 'Project not found',
          message: `Le projet avec l'ID ${params.id} n'existe pas.`
        })
      }

      return response.status(500).json({
        error: 'Internal server error',
        message: 'Une erreur est survenue lors de l\'accès à la page de recommandation.'
      })
    }
  }

  /**
   * ✅ FONCTION UTILITAIRE : Déterminer l'URL frontend selon l'environnement
   * Utilise la même logique que les callsheets pour la cohérence
   */
  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')
    const port = env.get('PORT', '3333')

    console.log('🔍 Environment detection for recommendation:', {
      FRONTEND_URL: envUrl,
      NODE_ENV: nodeEnv,
      HOST: host,
      PORT: port,
    })

    // Si FRONTEND_URL est définie explicitement et n'est pas localhost, l'utiliser
    if (envUrl && !envUrl.includes('localhost')) {
      console.log(`🌐 Using explicit FRONTEND_URL: ${envUrl}`)
      return envUrl
    }

    // Détection automatique basée sur HOST et NODE_ENV
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // On est sur un serveur distant
      if (nodeEnv === 'development' || host.includes('universe.wf')) {
        const frontendUrl = 'http://tool.sc1ciro3903.universe.wf'
        console.log(`🧪 Auto-detected TEST environment: ${frontendUrl}`)
        return frontendUrl
      }

      if (nodeEnv === 'production' || host.includes('melomania.be')) {
        const frontendUrl = 'https://tool.melomania.be'
        console.log(`🚀 Auto-detected PRODUCTION environment: ${frontendUrl}`)
        return frontendUrl
      }

      // Fallback pour serveur distant non reconnu
      const isProduction = (nodeEnv as string) === 'production'
      const protocol = isProduction ? 'https' : 'http'
      const frontendUrl = `${protocol}://${host}`
      console.log(`⚡ Auto-detected REMOTE server: ${frontendUrl}`)
      return frontendUrl
    }

    // Développement local - utiliser le port du frontend Svelte
    const frontendUrl = 'http://localhost:5173'
    console.log(`🔧 Using LOCAL development: ${frontendUrl}`)
    return frontendUrl
  }

  /**
   * Soumettre une recommandation (route publique)
   */
  async submitRecommendation({ params, request, response }: HttpContext) {
    try {
      console.log('📝 Submitting recommendation for project:', params.id)

      // Validation des données
      const data = await request.validateUsing(vine.compile(
        vine.object({
          recommender_name: vine.string().trim().minLength(1),
          recommender_email: vine.string().email().optional(),
          recommendations: vine.array(
            vine.object({
              first_name: vine.string().trim().minLength(1),
              last_name: vine.string().trim().minLength(1),
              email: vine.string().email().optional(),
              phone: vine.string().optional(),
              messenger: vine.string().optional(),
              instrument: vine.string().optional(),
              message: vine.string().optional()
            })
          ).minLength(1).maxLength(5) // Max 5 recommandations par envoi
        })
      ))

      console.log('✅ Validation passed, data:', {
        recommender: data.recommender_name,
        recommendations_count: data.recommendations.length
      })

      // Vérifier que le projet existe
      const project = await Project.findOrFail(params.id)
      console.log('✅ Project found:', project.name)

      const createdRecommendations = []

      // Créer chaque recommandation
      for (const rec of data.recommendations) {
        // ✅ CORRECTION : Validation supplémentaire des champs requis
        if (!rec.first_name.trim() || !rec.last_name.trim()) {
          console.warn('⚠️ Skipping invalid recommendation (empty name):', rec)
          continue
        }

        // Vérifier qu'au moins un moyen de contact est fourni
        if (!rec.email && !rec.phone && !rec.messenger) {
          console.warn('⚠️ Skipping recommendation without contact info:', rec)
          continue
        }

        console.log('💾 Creating recommendation for:', `${rec.first_name} ${rec.last_name}`)

        // ✅ CORRECTION : S'assurer que les champs obligatoires ne sont pas vides
        const recommendation = await RecruitmentRecommendation.create({
          project_id: Number(params.id),
          recommender_name: data.recommender_name.trim(),
          recommender_email: data.recommender_email?.trim() || null,
          recommended_first_name: rec.first_name.trim(),
          recommended_last_name: rec.last_name.trim(),
          recommended_email: rec.email?.trim() || null,
          recommended_phone: rec.phone?.trim() || null,
          recommended_messenger: rec.messenger?.trim() || null,
          recommended_instrument: rec.instrument?.trim() || null,
          recommendation_message: rec.message?.trim() || null,
          status: 'pending' // ✅ Statut par défaut
        })

        createdRecommendations.push(recommendation)
        console.log('✅ Recommendation created with ID:', recommendation.id)
      }

      console.log('🎉 All recommendations processed:', createdRecommendations.length, 'created')

      // Optionnel : Envoyer une notification aux admins du projet
      if (createdRecommendations.length > 0) {
        await this.notifyProjectAdmins(project, createdRecommendations)
      }

      return response.json({
        success: true,
        message: `${createdRecommendations.length} recommendation(s) submitted successfully`,
        recommendations: createdRecommendations.map(r => r.serialize()),
        project: {
          id: project.id,
          name: project.name
        }
      })
    } catch (error) {
      console.error('❌ Error submitting recommendations:', error)

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({
          error: 'Project not found',
          message: `Le projet avec l'ID ${params.id} n'existe pas.`
        })
      }

      if (error.messages) {
        // Erreur de validation
        return response.status(400).json({
          error: 'Validation failed',
          message: 'Les données fournies ne sont pas valides.',
          details: error.messages
        })
      }

      return response.status(500).json({
        error: 'Failed to submit recommendations',
        message: 'Une erreur est survenue lors de l\'envoi des recommandations.',
        details: error.message
      })
    }
  }

  /**
   * Page de confirmation publique - REDIRECTION AUSSI
   */
  async confirmationPage({ response }: HttpContext) {
    try {
      const frontendUrl = this.getFrontendUrl()
      const redirectUrl = `${frontendUrl}/recommendation/success`

      console.log('🔄 Redirecting to confirmation page:', redirectUrl)
      return response.redirect(redirectUrl)
    } catch (error) {
      console.error('❌ Error in confirmation page:', error)
      return response.status(500).json({
        error: 'Internal server error'
      })
    }
  }

  /**
   * ✅ MÉTHODE PRIVÉE : Notifier les admins du projet des nouvelles recommandations
   */
  private async notifyProjectAdmins(project: any, recommendations: any[]) {
    try {
      console.log('📧 Notifying project admins about new recommendations')
      console.log('📊 Project:', project.name)
      console.log('📊 Recommendations count:', recommendations.length)

      // Ici vous pouvez implémenter :
      // - Envoi d'email aux responsables du projet
      // - Notification push
      // - Ajout dans un système de notifications internes
      // - etc.

      // Exemple de logique future :
      // await mail.send(new RecommendationNotification(project, recommendations))

      console.log('✅ Admin notification completed')
    } catch (error) {
      console.error('❌ Error notifying admins:', error)
      // Ne pas faire échouer la requête principale si la notification échoue
    }
  }
}
