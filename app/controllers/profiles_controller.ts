import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import ActivityLog from '#models/activity_log'

export default class ProfilesController {
  async update({ request, auth, response }: HttpContext) {
    try {
      // 1. Ensure the user is logged in and get their data
      const user = await auth.getUserOrFail()

      // 2. Grab the new profile data from the incoming Svelte request
      // (Adonis automatically converts these to snake_case for the database)
      const payload = request.only(['fullName', 'phone', 'avatarUrl'])

      // 3. Merge the new data into the user record
      user.merge(payload)

      // 4. Save the changes to the database
      await user.save()

      
      await ActivityLog.create({
        userId: user.id,
        action: 'profile_updated',
        ipAddress: request.ip(),
        userAgent: request.header('user-agent'),
      })
      
      // 5. Send a success response back to Svelte
      return response.json({ 
        message: 'Profile updated successfully!', 
        user 
      })
    } catch (error) {
      return response.status(400).json({ 
        message: 'Failed to update profile.', 
        error: error.message 
      })
    }
  }
}