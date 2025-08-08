// app/controllers/recruitment_recommendation_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Project from '#models/project'
import vine from '@vinejs/vine'

export default class RecruitmentRecommendationController {
  // Page publique de recommandation
  async getRecommendationPage({ params, view }: HttpContext) {
    const project = await Project.findOrFail(params.id)

    return view.render('recruitment/recommend', {
      project,
      projectId: params.id
    })
  }

  // Soumettre une recommandation (route publique)
  async submitRecommendation({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(vine.compile(
      vine.object({
        recommender_name: vine.string().trim(),
        recommender_email: vine.string().email().optional(),
        recommendations: vine.array(
          vine.object({
            first_name: vine.string().trim(),
            last_name: vine.string().trim(),
            email: vine.string().email().optional(),
            phone: vine.string().optional(),
            messenger: vine.string().optional(),
            instrument: vine.string().optional(),
            message: vine.string().optional()
          })
        ).minLength(1).maxLength(5) // Max 5 recommandations par envoi
      })
    ))

    const project = await Project.findOrFail(params.id)
    const createdRecommendations = []

    for (const rec of data.recommendations) {
      const recommendation = await RecruitmentRecommendation.create({
        project_id: params.id,
        recommender_name: data.recommender_name,
        recommender_email: data.recommender_email,
        recommended_first_name: rec.first_name,
        recommended_last_name: rec.last_name,
        recommended_email: rec.email,
        recommended_phone: rec.phone,
        recommended_messenger: rec.messenger,
        recommended_instrument: rec.instrument,
        recommendation_message: rec.message
      })

      createdRecommendations.push(recommendation)
    }

    // Optionnel : Envoyer une notification aux admins du projet
    // await this.notifyProjectAdmins(project, createdRecommendations)

    return response.json({
      success: true,
      message: `${createdRecommendations.length} recommendation(s) submitted successfully`,
      recommendations: createdRecommendations
    })
  }

  // Page de confirmation publique
  async confirmationPage({ view }: HttpContext) {
    return view.render('recruitment/recommend-success')
  }

  private async notifyProjectAdmins(project: any, recommendations: any[]) {
    // Logique de notification (email, notification interne, etc.)
    // À implémenter selon vos besoins
  }
}
