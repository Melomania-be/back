import { HttpContext } from '@adonisjs/core/http'
import RecruitmentRecommendation from '#models/recruitment_recommendation'
import Project from '#models/project'
import vine from '@vinejs/vine'
import env from '#start/env'

export default class RecruitmentRecommendationController {

  async getRecommendationPage({ params, response }: HttpContext) {
    try {
      await Project.findOrFail(params.id) // Vérifie l'existence
      const redirectUrl = `${this.getFrontendUrl()}/projects/${params.id}/recommend`
      return response.redirect(redirectUrl)
    } catch (error) { return response.status(404).json({ error: 'Project not found' }) }
  }

  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL'); const nodeEnv = env.get('NODE_ENV', 'development'); const host = env.get('HOST', 'localhost')
    if (envUrl && !envUrl.includes('localhost') && envUrl.trim() !== '') return envUrl
    if (host && host !== 'localhost' && host !== '127.0.0.1') return nodeEnv === 'development' || host.includes('universe.wf') ? 'http://tool.sc1ciro3903.universe.wf' : 'https://tool.melomania.be'
    return 'http://localhost:5173'
  }

  async submitRecommendation({ params, request, response }: HttpContext) {
    try {
      const data = await request.validateUsing(vine.compile(vine.object({ recommender_name: vine.string().trim().minLength(1), recommender_email: vine.string().email().optional(), recommendations: vine.array(vine.object({ first_name: vine.string().trim().minLength(1), last_name: vine.string().trim().minLength(1), email: vine.string().email().optional(), phone: vine.string().optional(), messenger: vine.string().optional(), instrument: vine.string().optional(), message: vine.string().optional() })).minLength(1).maxLength(5) })))
      const project = await Project.findOrFail(params.id)
      const createdRecommendations = []

      for (const rec of data.recommendations) {
        if (!rec.first_name.trim() || !rec.last_name.trim() || (!rec.email && !rec.phone && !rec.messenger)) continue
        try {
          createdRecommendations.push(await RecruitmentRecommendation.create({ project_id: project.id, recommender_name: data.recommender_name.trim(), recommender_email: data.recommender_email?.trim() || null, recommended_first_name: rec.first_name.trim(), recommended_last_name: rec.last_name.trim(), recommended_email: rec.email?.trim() || null, recommended_phone: rec.phone?.trim() || null, recommended_messenger: rec.messenger?.trim() || null, recommended_instrument: rec.instrument?.trim() || null, recommendation_message: rec.message?.trim() || null, status: 'pending' }))
        } catch (dbError) { continue }
      }
      return response.json({ success: true, recommendations: createdRecommendations.map((r) => r.serialize()), project: { id: project.id, name: project.name } })
    } catch (error) { return response.status(400).json({ error: 'Validation/Submit failed' }) }
  }

  async confirmationPage({ response }: HttpContext) { return response.redirect(`${this.getFrontendUrl()}/recommendation/success`) }
}