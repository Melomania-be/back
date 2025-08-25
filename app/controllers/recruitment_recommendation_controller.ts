import { HttpContext } from '@adonisjs/core/http'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Project from '#models/project'
import vine from '@vinejs/vine'
import env from '#start/env'

export default class RecruitmentRecommendationController {
  async getRecommendationPage({ params, response }: HttpContext) {
    try {
      const project = await Project.findOrFail(params.id)

      const frontendUrl = this.getFrontendUrl()
      const redirectUrl = `${frontendUrl}/projects/${params.id}/recommend`

      return response.redirect(redirectUrl)
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({
          error: 'Project not found',
          message: `Le projet avec l'ID ${params.id} n'existe pas.`,
        })
      }

      return response.status(500).json({
        error: 'Internal server error',
        message: "Une erreur est survenue lors de l'accès à la page de recommandation.",
      })
    }
  }

  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')

    if (envUrl && !envUrl.includes('localhost') && envUrl.trim() !== '') {
      return envUrl
    }

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (nodeEnv === 'development' || host.includes('universe.wf')) {
        return 'http://tool.sc1ciro3903.universe.wf'
      }

      const isProduction = nodeEnv === 'production'
      if (isProduction || host.includes('melomania.be')) {
        return 'https://tool.melomania.be'
      }

      const protocol = isProduction ? 'https' : 'http'
      return `${protocol}://${host}`
    }

    return 'http://localhost:5173'
  }

  async submitRecommendation({ params, request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(
        vine.compile(
          vine.object({
            recommender_name: vine.string().trim().minLength(1),
            recommender_email: vine.string().email().optional(),
            recommendations: vine
              .array(
                vine.object({
                  first_name: vine.string().trim().minLength(1),
                  last_name: vine.string().trim().minLength(1),
                  email: vine.string().email().optional(),
                  phone: vine.string().optional(),
                  messenger: vine.string().optional(),
                  instrument: vine.string().optional(),
                  message: vine.string().optional(),
                })
              )
              .minLength(1)
              .maxLength(5),
          })
        )
      )

      const project = await Project.findOrFail(params.id)

      const createdRecommendations = []

      for (const rec of data.recommendations) {
        if (!rec.first_name.trim() || !rec.last_name.trim()) {
          continue
        }

        if (!rec.email && !rec.phone && !rec.messenger) {
          continue
        }

        try {
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
            status: 'pending',
          })

          createdRecommendations.push(recommendation)
        } catch (dbError) {
          console.error('Database error creating recommendation:', dbError)
          // Continue avec les autres recommandations même si une échoue
          continue
        }
      }

      if (createdRecommendations.length > 0) {
        await this.notifyProjectAdmins(project, createdRecommendations)
      }

      return response.json({
        success: true,
        message: `${createdRecommendations.length} recommendation(s) submitted successfully`,
        recommendations: createdRecommendations.map((r) => r.serialize()),
        project: {
          id: project.id,
          name: project.name,
        },
      })
    } catch (error) {
      console.error('Submit recommendation error:', error)

      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({
          error: 'Project not found',
          message: `Le projet avec l'ID ${params.id} n'existe pas.`,
        })
      }

      if (error.messages) {
        return response.status(400).json({
          error: 'Validation failed',
          message: 'Les données fournies ne sont pas valides.',
          details: error.messages,
        })
      }

      return response.status(500).json({
        error: 'Failed to submit recommendations',
        message: "Une erreur est survenue lors de l'envoi des recommandations.",
        details: error.message,
      })
    }
  }

  async confirmationPage({ response }: HttpContext) {
    try {
      const frontendUrl = this.getFrontendUrl()
      const redirectUrl = `${frontendUrl}/recommendation/success`

      return response.redirect(redirectUrl)
    } catch (error) {
      return response.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  private async notifyProjectAdmins(project: any, recommendations: any[]) {
    try {
      // Ici vous pouvez implémenter la notification des admins
      console.log(`New recommendations for project ${project.name}:`, recommendations.length)
    } catch (error) {
      console.error('Error notifying admins:', error)
      // Ne pas faire échouer la requête principale si la notification échoue
    }
  }
}
