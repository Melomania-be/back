import { HttpContext } from '@adonisjs/core/http'
import Registration from '#models/registration'
import { createRegistrationValidator, userRegistrationValidator } from '#validators/registration'
import Contact from '#models/contact'
import Participant from '#models/participant'
import Answer from '#models/answer'
import Project from '#models/project'
import RecruitmentAlert from '#models/recruitmentAlert' // NEW: Import RecruitmentAlert model
import db from '@adonisjs/lucid/services/db'

import Section from '#models/section' // NEW: Import Section model
import Recruitment from '#models/recruitment' // NEW: Import Recruitment model
import User from '#models/user' // NEW: Import User model for `contactedBy` if needed
import { DateTime } from 'luxon' // NEW: Import DateTime for timestamps

export type RecruitmentStatus =
  | 'not yet contacted'
  | 'awaiting response'
  | 'interested'
  | 'participating'
  | 'registered'
  | 'not available'
  | 'pending validation'
  | 'to follow up'
  | 'cancelled'
  | 'other'

export default class RegistrationsController {
  async getAll() {
    return await Registration.query()
  }

  async getOne({ params, response }: HttpContext) {
    const projectId = Number(params.id)

    if (Number.isNaN(projectId)) {
      return response.send('Invalid registration ID')
    }

    const registration = await Registration.query()
      .whereHas('project', (query) => {
        query.where('id', projectId)
      })
      .preload('content')
      .preload('project', (projectQuery) => {
        projectQuery
          .preload('rehearsals', (rehearsalQuery) => {
            rehearsalQuery.preload('participants', (participantQuery) => {
              participantQuery.pivotColumns(['comment'])
            })
          })
          .preload('concerts', (concertQuery) => {
            concertQuery.preload('participants', (participantQuery) => {
              participantQuery.pivotColumns(['comment'])
            })
          })
          .preload('pieces', (pieceQuery) => {
            pieceQuery.preload('composer')
          })
          .preload('sectionGroup', (sectionQuery) => {
            sectionQuery.preload('sections')
          })
      })
      .preload('form')
      .first()

    if (!registration) {
      return response.abort('Registration not found', 404)
    }

    return registration
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createRegistrationValidator)

    let project = await Project.findOrFail(data.params.id)

    let registration = await project.related('registration').query().first()

    if (registration) {
      await registration.related('content').query().delete()
      registration.related('content').createMany(data.content)

      for (const form of data.form) {
        if (form.id) {
          await registration.related('form').query().where('id', form.id).update({
            text: form.text,
            type: form.type,
          })
        } else {
          await registration.related('form').create({
            text: form.text,
            type: form.type,
          })
        }
      }
    } else {
      registration = await project.related('registration').create({})
      registration.related('content').createMany(data.content)
      registration.related('form').createMany(data.form)
    }

    return registration
  }

  async delete({ params, response }: HttpContext) {
    const projectId = Number(params.id)

    if (Number.isNaN(projectId)) {
      return response.send('Invalid project ID')
    }

    const registration = await Registration.query().where('project_id', projectId).firstOrFail()

    await registration.delete()
    return response.send('Registration deleted')
  }

  async submit(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(userRegistrationValidator)
    console.log('Data sent : ', data)

    let searchContact = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
    }
    let saveContact = { phone: data.phone, messenger: data.messenger, validated: false }

    //Checking if the user entering his info is already in the db, if not it creates a new contact
    let contact = await Contact.firstOrCreate(searchContact, saveContact)
    console.log('Contact sent : ', contact)

    let searchParticipant = {
      contact_id: contact.id,
      project_id: data.project_id,
    }

    let saveParticipant = {
      section_id: data.section_id,
      accepted: false,
      last_activity: new Date(),
    }

    //Checking if the contact is already in the participant db with this project, if not its added
    let participant = await Participant.firstOrCreate(searchParticipant, saveParticipant)

    const rehearsalsWithComments = data.rehearsals.reduce(
      (acc, rehearsal) => {
        acc[rehearsal.id] = { comment: rehearsal.comment ?? '' }
        return acc
      },
      {} as Record<number, { comment: string }>
    )
    console.log('Rehearsals sent : ', rehearsalsWithComments)
    await participant.related('rehearsals').sync(rehearsalsWithComments)

    const concertsWithComments = data.concerts.reduce(
      (acc, concert) => {
        acc[concert.id] = { comment: concert.comment ?? '' }
        return acc
      },
      {} as Record<number, { comment: string }>
    )
    console.log('Concerts sent : ', concertsWithComments)
    await participant.related('concerts').sync(concertsWithComments)

    //Puting the answer in the answer table if there is a form to fill
    if (data.answers.length === 0) {
      // --- NEW: Call recruitment creation here if no answers ---
      await this._createRecruitmentFromParticipant(contact, participant, 'pending validation', null)
      // --- END NEW ---
      return ctx.response.json({ success: true, participant })
    }

    const answer = await Answer.createMany(
      data.answers.map((answerIt) => {
        return {
          text: answerIt.text ?? '',
          form_id: answerIt.form_id,
          participant_id: participant.id,
        }
      })
    )
    // --- NEW: Call recruitment creation here after answers are saved ---
    await this._createRecruitmentFromParticipant(contact, participant, 'pending validation', null)
    // --- END NEW ---
    return ctx.response.json({ success: true, participant, answer })
  }

  // NEW METHOD
  // private async _createRecruitmentFromParticipant(
  //   contact: Contact,
  //   participant: Participant,
  //   initialStatus: RecruitmentStatus, // NEW PARAMETER
  //   initialContactedBy: number | null // NEW PARAMETER
  // ) {
  //   try {
  //     let finalSectionId: number

  //     await participant.load('section', (sectionQuery) => {
  //       sectionQuery.preload('section_groups')
  //     })

  //     if (
  //       participant.section &&
  //       participant.section.section_groups &&
  //       participant.section.section_groups.length > 0
  //     ) {
  //       finalSectionId = participant.section.section_groups[0].id
  //     } else {
  //       console.error(
  //         `ERROR: Participant ${participant.id} (Section ID: ${participant.section_id}) could not be linked to a SectionGroup. Recruitment creation requires a valid sectionGroupId.`
  //       )
  //       throw new Error(
  //         'Missing associated section group for recruitment creation. Cannot create record.'
  //       )
  //     }

  //     // 2. contactedBy is now passed as a parameter
  //     // No need for SYSTEM_USER_ID lookup here, as it's provided by the caller.

  //     // 3. Construct the new Recruitment data object
  //     const newRecruitmentData = {
  //       firstName: contact.first_name,
  //       lastName: contact.last_name,
  //       sectionId: finalSectionId,
  //       projectId: participant.project_id,
  //       status: initialStatus, // Use the passed initialStatus
  //       contactDate: DateTime.now().toUTC(),
  //       contactedBy: initialContactedBy, // Use the passed initialContactedBy
  //       comment: 'Automatically created from participant registration.',
  //     }

  //     const newRecruitment = await Recruitment.create(newRecruitmentData)
  //     console.log(
  //       `LOG: Successfully created new Recruitment record for ${newRecruitment.firstName} ${newRecruitment.lastName} (ID: ${newRecruitment.id}) with status '${initialStatus}'`
  //     )
  //   } catch (error) {
  //     console.error(
  //       'ERROR: Failed to automatically create Recruitment record during participant registration:',
  //       error
  //     )
  //     throw error
  //   }
  // }

  private async _createRecruitmentFromParticipant(
    contact: Contact,
    participant: Participant,
    initialStatus: RecruitmentStatus,
    initialContactedBy: number | null
  ) {
    const SIMILARITY_THRESHOLD = 2 // Define your Levenshtein distance threshold

    try {
      // 1. Determine the final section_id
      let finalSectionId: number
      await participant.load('section', (sectionQuery) => {
        sectionQuery.preload('section_groups')
      })

      if (
        participant.section &&
        participant.section.section_groups &&
        participant.section.section_groups.length > 0
      ) {
        finalSectionId = participant.section.section_groups[0].id
      } else {
        console.error(
          `ERROR: Participant ${participant.id} (Section ID: ${participant.section_id}) could not be linked to a SectionGroup. Recruitment creation requires a valid sectionGroupId.`
        )
        throw new Error(
          'Missing associated section group for recruitment creation. Cannot create record.'
        )
      }

      // 2. Prepare common data for new/updated recruitment
      const commonRecruitmentData = {
        firstName: contact.first_name,
        lastName: contact.last_name,
        sectionId: finalSectionId,
        projectId: participant.project_id, // Can be null
        contactDate: DateTime.now().toUTC(),
        contactedBy: initialContactedBy, // Will be null for self-registration
        comment: 'Automatically created/updated from participant registration.',
      }

      // --- NEW LOGIC: Exact Match and Similarity Check ---
      const newRecruitFullName = `${contact.first_name.toLowerCase()} ${contact.last_name.toLowerCase()}`
      console.log(`LOG: New recruit's full name for similarity check: "${newRecruitFullName}"`) // DEBUG LOG

      // Find existing recruitments with the same name and project ID
      // const existingRecruitments = await Recruitment.query()
      //   .where('firstName', contact.first_name)
      //   .andWhere('lastName', contact.last_name)
      //   .where('projectId', participant.project_id) // Match within the same project
      //   .exec() // Get all potential exact/similar matches

      // console.log(
      //   'LOG: Initial query for existing recruitments returned:',
      //   existingRecruitments.map((r) => ({
      //     id: r.id,
      //     firstName: r.firstName,
      //     lastName: r.lastName,
      //     projectId: r.projectId,
      //   }))
      // )

      const allRecruitmentsInProject = await Recruitment.query()
        .where('projectId', participant.project_id) // Fetch all in this project
        .exec()

      console.log(
        'LOG: All recruitments in project for similarity check returned:',
        allRecruitmentsInProject.map((r) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          projectId: r.projectId,
        }))
      )

      let exactMatchFound = false
      let existingRecruitmentToUpdate: Recruitment | null = null
      let similarRecruitments: Recruitment[] = []

      for (const existingRec of allRecruitmentsInProject) {
        const existingFullName = `${existingRec.firstName.toLowerCase()} ${existingRec.lastName.toLowerCase()}`
        console.log(
          `LOG: Comparing "${newRecruitFullName}" with existing "${existingFullName}" (ID: ${existingRec.id})`
        ) // DEBUG LOG

        if (existingFullName === newRecruitFullName) {
          // Found an exact match
          exactMatchFound = true
          existingRecruitmentToUpdate = existingRec
          console.log('LOG: Exact match detected. Skipping similarity check for this record.') // DEBUG LOG

          // break // Found the exact one, no need to check others for this purpose
        } else {
          // Check for similarity if not an exact match
          const distance = this.getLevenshteinDistance(newRecruitFullName, existingFullName)
          console.log(
            `LOG: Levenshtein distance between "${newRecruitFullName}" and "${existingFullName}": ${distance}`
          )
          if (distance > 0 && distance <= SIMILARITY_THRESHOLD) {
            similarRecruitments.push(existingRec)
            console.log('LOG: Similar record added to list.')
          }
        }
      }

      console.log(
        'LOG: Final similarRecruitments array (before alert creation check):',
        similarRecruitments.map((r) => r.id)
      ) // DEBUG LOG
      let newRecruitment: Recruitment

      if (exactMatchFound && existingRecruitmentToUpdate) {
        // --- SCENARIO 1: Exact Match Found (Update Existing) ---
        console.log(
          `LOG: Exact match found for ${newRecruitFullName} in Project ${participant.project_id}. Updating existing Recruitment ID: ${existingRecruitmentToUpdate.id}`
        )

        // Update the existing recruitment's status and relevant fields
        existingRecruitmentToUpdate.merge({
          ...commonRecruitmentData, // Copy common fields
          status: initialStatus, // Set to 'pending validation'
          contactDate: commonRecruitmentData.contactDate, // Update contact date to now
          contactedBy: commonRecruitmentData.contactedBy, // Update contactedBy to null
          comment: 'Status updated due to new registration (exact match).', // Update comment
        })
        await existingRecruitmentToUpdate.save()
        newRecruitment = existingRecruitmentToUpdate // Treat the updated one as the "new" one for logging/alerting context
      } else {
        // --- SCENARIO 2: No Exact Match (Create New) ---
        console.log(
          `LOG: No exact match found for ${newRecruitFullName} in Project ${participant.project_id}. Creating new Recruitment record.`
        )
        newRecruitment = await Recruitment.create({
          ...commonRecruitmentData,
          status: initialStatus, // Set to 'pending validation'
          comment: 'Automatically created from participant registration.',
        })

        // If a new record was created, check for similarities and create an alert
        if (similarRecruitments.length > 0) {
          console.log(
            `LOG: New Recruitment ID ${newRecruitment.id} has similar names:`,
            similarRecruitments.map((r) => `${r.firstName} ${r.lastName} (ID: ${r.id})`)
          )
          // Create an alert for each similar recruitment found
          for (const similarRec of similarRecruitments) {
            // Make sure not to create an alert for the exact same record if it somehow slipped through
            if (newRecruitment.id !== similarRec.id) {
              // Prevent self-similarity alert
              await RecruitmentAlert.create({
                newRecruitmentId: newRecruitment.id,
                similarToRecruitmentId: similarRec.id,
                alertType: 'similarity_conflict',
                message: `New registration for '${newRecruitment.firstName} ${newRecruitment.lastName}' is similar to existing recruit '${similarRec.firstName} ${similarRec.lastName}' in Project ${similarRec.projectId}.`,
                isResolved: false,
              })
              console.log(
                `LOG: Created similarity alert for newRecruitmentId ${newRecruitment.id} and similarToRecruitmentId ${similarRec.id}`
              )
            }
          }
        }
      }
      // --- END NEW LOGIC ---

      console.log(
        `LOG: Final Recruitment record processed: ID ${newRecruitment.id}, Status: '${newRecruitment.status}'`
      )
    } catch (error) {
      console.error(
        'ERROR: Failed to automatically create/update Recruitment record during participant registration:',
        error
      )
      throw error
    }
  }

  /**
   * Helper function: Levenshtein Distance (for similarity check)
   * This should ideally be a utility function in a shared place, but adding here for self-containment.
   */
  private getLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length

    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null))

    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        )
      }
    }
    return matrix[b.length][a.length]
  }
}
