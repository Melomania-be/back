// app/Controllers/RecruitmentAlertsController.ts

import { HttpContext } from '@adonisjs/core/http'
import RecruitmentAlert from '#models/recruitmentAlert' // Import the RecruitmentAlert model
import Recruitment from '#models/recruitment' // Import Recruitment model for preloading
import Participant from '#models/participant' // Make sure this import is correct
import Contact from '#models/contact'
import db from '@adonisjs/lucid/services/db' // Import db for transactions in resolution methods (future step)
import { RecruitmentStatus } from '#models/recruitment' // Import RecruitmentStatus (future step)
import { DateTime } from 'luxon'

export default class RecruitmentAlertsController {
  /**
   * GET: Fetches a list of unresolved recruitment alerts.
   * Allows filtering by isResolved status.
   *
   * Query Parameters:
   * - isResolved: boolean (optional, defaults to false if not provided)
   */
  async getAll({ request, response }: HttpContext) {
    try {
      const { isResolved } = request.qs() // Get query parameter

      let query = RecruitmentAlert.query()
        // .preload('newRecruitment') // Preload the new recruitment details
        // .preload('similarToRecruitment') // Preload the similar existing recruitment details
        .preload('newRecruitment', (recruitmentQuery) => {
          recruitmentQuery.preload('project').preload('section')
        })
        // Preload similarToRecruitment and its nested project
        .preload('similarToRecruitment', (recruitmentQuery) => {
          recruitmentQuery.preload('project').preload('section')
        })

      // Apply filter for resolution status
      if (isResolved === 'true') {
        query.where('is_resolved', true)
      } else if (isResolved === 'false' || isResolved === undefined) {
        // Default to fetching unresolved alerts if not specified or explicitly false
        query.where('is_resolved', false)
      }

      const alerts = await query.orderBy('created_at', 'desc') // Order by newest first

      return response.ok(alerts)
    } catch (error) {
      console.error('Error fetching recruitment alerts:', error)
      return response.internalServerError({ message: 'Failed to retrieve recruitment alerts.' })
    }
  }

  /**
   * PATCH: Resolves a specific recruitment alert by setting is_resolved to true.
   */
  async resolveAlert({ params, response }: HttpContext) {
    try {
      const alert = await RecruitmentAlert.find(params.id)
      if (!alert) {
        return response.notFound({ message: 'Recruitment alert not found.' })
      }

      alert.isResolved = true
      await alert.save()

      return response.ok({ message: 'Recruitment alert resolved successfully.' })
    } catch (error) {
      console.error('Error resolving recruitment alert:', error)
      return response.internalServerError({ message: 'Failed to resolve alert.' })
    }
  }

  /**
   * POST: Resolves a similarity alert by updating the existing similar recruit's status
   * and deleting the newly created (duplicate) recruit.
   * This is triggered by the "Update Existing Status (and Delete New)" action.
   *
   * Request Body (implicit, from route params):
   * - alertId: The ID of the RecruitmentAlert to resolve.
   */
  // async resolveAlertAsUpdate({ params, response }: HttpContext) {
  //   try {
  //     const alert = await RecruitmentAlert.query()
  //       .where('id', params.id)
  //       .preload('newRecruitment') // Need the actual models for deletion/update
  //       .preload('similarToRecruitment')
  //       .first()

  //     if (!alert) {
  //       return response.notFound({ message: 'Recruitment alert not found.' })
  //     }
  //     if (alert.isResolved) {
  //       return response.badRequest({ message: 'This alert has already been resolved.' })
  //     }
  //     if (!alert.newRecruitment) {
  //       return response.badRequest({ message: 'New recruitment for this alert is missing.' })
  //     }
  //     // here
  //     if (!alert.similarToRecruitment) {
  //       return response.badRequest({
  //         message: 'Similar existing recruitment for this alert is missing.',
  //       })
  //     }

  //     // Use a transaction to ensure atomicity: either both update/delete succeed or both fail
  //     await db.transaction(async (trx) => {

  //       // 1. Delete the *newly created* (potential duplicate) recruitment
  //       await alert.newRecruitment.useTransaction(trx).delete()
  //       console.log(`LOG: Deleted new recruitment ID ${alert.newRecruitment.id}.`)

  //       // --- REMOVED: Automatic status update for similarToRecruitment ---
  //       // The following lines are REMOVED:
  //       // if (alert.similarToRecruitment) {
  //       //   alert.similarToRecruitment.useTransaction(trx);
  //       //   alert.similarToRecruitment.status = 'registered' as RecruitmentStatus;
  //       //   alert.similarToRecruitment.contactDate = DateTime.now().toUTC();
  //       //   alert.similarToRecruitment.contactedBy = null;
  //       //   alert.similarToRecruitment.comment = 'Status updated via admin resolution (similarity conflict).';
  //       //   await alert.similarToRecruitment.save();
  //       //   console.log(`LOG: Updated similar recruitment ID ${alert.similarToRecruitment.id} to 'registered'.`);
  //       // }
  //       // --- END REMOVED ---

  //       // --- RE-ADD AND MODIFY THIS SECTION ---
  //       // 2. Update the status of the similar existing recruit
  //       alert.similarToRecruitment.useTransaction(trx) // Associate with transaction
  //       alert.similarToRecruitment.status = 'pending validation' as RecruitmentStatus // Set the desired status
  //       alert.similarToRecruitment.contactDate = DateTime.now().toUTC() // Update contact date
  //       alert.similarToRecruitment.contactedBy = null // Reset or set who contacted them
  //       alert.similarToRecruitment.comment =
  //         'Status updated via admin resolution (similarity conflict).' // Add a relevant comment
  //       await alert.similarToRecruitment.save() // Save the changes
  //       console.log(
  //         `LOG: Updated similar recruitment ID ${alert.similarToRecruitment.id} to '${alert.similarToRecruitment.status}'.`
  //       )
  //       // --- END RE-ADDED SECTION ---

  //       // 2. Mark the alert as resolved
  //       alert.useTransaction(trx)
  //       alert.isResolved = true
  //       await alert.save()
  //       console.log(`LOG: Alert ID ${alert.id} resolved as update (new recruit deleted).`)
  //     })

  //     return response.ok({
  //       message: 'Alert resolved: existing recruitment updated and new recruitment deleted.',
  //     })
  //   } catch (error) {
  //     console.error('Error resolving alert as update:', error)
  //     return response.internalServerError({ message: 'Failed to resolve alert as update.' })
  //   }
  // }

  async resolveAlertAsUpdate({ params, response }: HttpContext) {
    try {
      const alert = await RecruitmentAlert.query()
        .where('id', params.id)
        .preload('newRecruitment')
        .preload('similarToRecruitment')
        .first()

      if (!alert) {
        return response.notFound({ message: 'Recruitment alert not found.' })
      }
      if (alert.isResolved) {
        return response.badRequest({ message: 'This alert has already been resolved.' })
      }
      if (!alert.newRecruitment) {
        return response.badRequest({ message: 'New recruitment for this alert is missing.' })
      }
      if (!alert.similarToRecruitment) {
        return response.badRequest({
          message: 'Similar existing recruitment for this alert is missing.',
        })
      }

      await db.transaction(async (trx) => {
        const newRecruitment = alert.newRecruitment

        // Ensure projectId is a number before proceeding, handle if null.
        // Assuming projectId is always expected to be present for a newRecruitment.
        if (newRecruitment.projectId === null || newRecruitment.projectId === undefined) {
          console.error(
            `ERROR: newRecruitment (${newRecruitment.id}) has a null or undefined projectId. Cannot process.`
          )
          return response.badRequest({ message: 'New recruitment is missing a project ID.' })
        }

        // --- STEP 1: Find and delete the associated Participant and potentially the Contact ---
        const contactToDelete = await Contact.query()
          .useTransaction(trx) // Corrected: .useTransaction(trx)
          .where('first_name', newRecruitment.firstName)
          .andWhere('last_name', newRecruitment.lastName)
          .first()

        if (contactToDelete) {
          console.log(`LOG: Found Contact ID ${contactToDelete.id} based on newRecruitment name.`)

          // Check if contactToDelete.id is null before using it
          if (contactToDelete.id === null || contactToDelete.id === undefined) {
            console.error(
              `ERROR: Found contactToDelete but its ID is null. Cannot proceed with participant deletion.`
            )
            return response.internalServerError({
              message: 'Internal server error: Contact ID is missing.',
            })
          }

          const participantToDelete = await Participant.query()
            .useTransaction(trx) // Corrected: .useTransaction(trx)
            .where('contact_id', contactToDelete.id) // contactToDelete.id is now guaranteed non-null if we reach here
            .andWhere('project_id', newRecruitment.projectId) // newRecruitment.projectId is now guaranteed non-null
            .first()

          if (participantToDelete) {
            console.log(`LOG: Found Participant ID ${participantToDelete.id} to delete.`)

            await participantToDelete.related('answers').query().useTransaction(trx).delete() // Corrected: .useTransaction(trx)
            await participantToDelete.related('rehearsals').query().useTransaction(trx).delete() // Corrected: .useTransaction(trx)

            await participantToDelete.useTransaction(trx).delete() // Already correct
            console.log(`LOG: Deleted Participant ID ${participantToDelete.id}.`)

            const remainingParticipantsForContact = await Participant.query()
              .useTransaction(trx) // Corrected: .useTransaction(trx)
              .where('contact_id', contactToDelete.id)
              .count('* as total')

            // The `count` result from AdonisJS typically returns an array like [{ $extras: { total: '1' } }]
            // $extras.total will be a string, so convert to Number.
            const totalRemainingParticipants = Number(
              remainingParticipantsForContact[0].$extras.total
            )

            if (totalRemainingParticipants === 0) {
              console.log(
                `LOG: Contact ID ${contactToDelete.id} is now orphaned. Deleting Contact.`
              )
              await contactToDelete.useTransaction(trx).delete() // Already correct
              console.log(`LOG: Deleted Contact ID ${contactToDelete.id}.`)
            } else {
              console.log(
                `LOG: Contact ID ${contactToDelete.id} still linked to ${totalRemainingParticipants} other participants. Not deleting Contact.`
              )
            }
          } else {
            console.warn(
              `WARN: No Participant found for newRecruitment (Contact ID: ${contactToDelete.id}, Project ID: ${newRecruitment.projectId}). Participant not deleted.`
            )
          }
        } else {
          console.warn(
            `WARN: No Contact found matching newRecruitment's name (${newRecruitment.firstName} ${newRecruitment.lastName}). Neither Participant nor Contact deleted based on name.`
          )
        }

        // --- STEP 2: Delete the new Recruitment record ---
        console.log(`LOG: Deleting new Recruitment ID ${newRecruitment.id}.`)
        await newRecruitment.useTransaction(trx).delete() // Already correct
        console.log(`LOG: Deleted new Recruitment ID ${newRecruitment.id}.`)

        // --- STEP 3: Update the status of the similar existing recruitment ---
        alert.similarToRecruitment.useTransaction(trx) // Already correct
        alert.similarToRecruitment.status = 'pending validation' as RecruitmentStatus
        alert.similarToRecruitment.contactDate = DateTime.now().toUTC()
        alert.similarToRecruitment.contactedBy = null
        alert.similarToRecruitment.comment =
          'Status updated via admin resolution (similarity conflict).'
        await alert.similarToRecruitment.save()
        console.log(
          `LOG: Updated similar recruitment ID ${alert.similarToRecruitment.id} to '${alert.similarToRecruitment.status}'.`
        )

        // --- STEP 4: Mark the alert as resolved ---
        alert.useTransaction(trx) // Already correct
        alert.isResolved = true
        alert.resolvedAt = DateTime.now().toUTC()
        await alert.save()
        console.log(`LOG: Alert ID ${alert.id} resolved as 'Update'.`)
      })

      return response.ok({
        message:
          'Alert resolved: existing recruitment updated, and new recruitment, participant, and associated contact (if orphaned) deleted.',
      })
    } catch (error) {
      console.error('ERROR: Failed to resolve alert as update:', error)
      return response.internalServerError({ message: 'Failed to resolve alert as update.' })
    }
  }
}
