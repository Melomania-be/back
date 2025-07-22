// import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'
import { simpleFilter, advancedFilter } from 'adonisjs-filters'
import { createContactValidator, mergeContactsValidator } from '#validators/contact'
import { HttpContext } from '@adonisjs/core/http'
import Recruitment, { RecruitmentStatus } from '#models/recruitment' // NEW: Import Recruitment model and RecruitmentStatus
import Participant from '#models/participant' // NEW: Import Participant model for robust lookup

export default class ContactsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Contact.query().preload('instruments', (instrumentsQuery) => {
      instrumentsQuery.pivotColumns(['proficiency_level'])
    })

    return await simpleFilter(
      ctx,
      baseQuery,
      ['first_name', 'last_name', 'email', 'comments', 'messenger', 'phone'],
      [{ relationColumns: ['family', 'name'], relationName: 'instruments' }]
    )
  }

  async getOne({ params }: HttpContext) {
    return await Contact.query()
      .where('id', params.id)
      .preload('instruments')
      .preload('lists')
      .preload('participants', (query) => {
        query
          .preload('project')
          .preload('section', (subQuery) => {
            subQuery.preload('instruments')
          })
          .preload('answers')
      })
      .firstOrFail()
  }

  async advancedSearch(ctx: HttpContext) {
    let baseQuery = Contact.query()
      .preload('instruments', (instrumentsQuery) => {
        instrumentsQuery.pivotColumns(['proficiency_level'])
      })
      .preload('lists')
      .preload('participants')
      .preload('projects')

    const data = await advancedFilter(ctx, baseQuery)

    return {
      data,
      columns: {
        self: ['id', 'first_name', 'last_name', 'email', 'comments', 'messenger', 'phone'],
        instruments: ['id', 'family', 'name'],
        projects: ['id', 'name'],
        participants: ['id', 'project', 'section', 'answers'],
        lists: ['id', 'name'],
      },
    }
  }

  async mergeContacts(ctx: HttpContext) {
    console.log(ctx.request.all())

    const data = await ctx.request.validateUsing(mergeContactsValidator)

    if (!data.contactId1 && !data.contactId2) {
      return ctx.response.status(400).send('No contact ids provided')
    }

    if (data.contactId1 === data.contactId2) {
      return ctx.response.status(400).send('Cannot merge a contact with itself')
    }

    const contact1 = await Contact.query()
      .preload('instruments')
      .preload('lists')
      .preload('participants')
      .preload('projects')
      .where('id', data.contactId1)
      .firstOrFail()
    const contact2 = await Contact.query()
      .preload('instruments')
      .preload('lists')
      .preload('participants')
      .preload('projects')
      .where('id', data.contactId2)
      .firstOrFail()

    contact1.first_name = data.first_name ?? contact1.first_name
    contact1.last_name = data.last_name ?? contact1.last_name
    contact1.email = data.email ?? contact1.email
    contact1.phone = data.phone ?? contact1.phone
    contact1.messenger = data.messenger ?? contact1.messenger
    contact1.comments = data.comments ?? contact1.comments
    contact1.validated = true
    contact1.subscribed = true

    await contact1.save()

    await contact1.related('lists').sync(
      contact1.lists.concat(contact2.lists).map((list) => list.id),
      false // Avoid detaching and creating a contact instead of updating it
    )

    await contact1.related('projects').sync(
      contact1.projects.concat(contact2.projects).map((project) => project.id),
      false
    )

    const participants1 = await contact1.related('participants').query()
    const participants2 = await contact2.related('participants').query()

    const projectIds1 = new Set(participants1.map((p) => p.project_id))

    for (let participant2 of participants2) {
      if (projectIds1.has(participant2.project_id)) {
        const participant1 = participants1.find((p) => p.project_id === participant2.project_id)
        if (participant1) {
          await participant1.delete()
        }
      }
      participant2.contact_id = contact1.id
      await participant2.save()
    }

    await contact1.related('instruments').sync(
      contact1.instruments.concat(contact2.instruments).map((instrument) => instrument.id),
      false
    )

    await contact2.delete()

    return contact1
  }

  // async createOrUpdate(ctx: HttpContext) {
  //   console.log('createOrUpdate called')
  //   console.log(ctx.request.all())

  //   const data = await ctx.request.validateUsing(createContactValidator)

  //   if (!data.id) {
  //     return await Contact.create({ ...data, validated: true })
  //   }

  //   const contact = await Contact.updateOrCreate({ id: data.id }, { ...data, validated: true })

  //   if (data.instruments) {
  //     let toSync = Object.assign(
  //       {},
  //       ...data.instruments.map((instrument) => {
  //         return {
  //           [instrument.id]: {
  //             proficiency_level: instrument.pivot_proficiency_level,
  //           },
  //         }
  //       })
  //     )

  //     await contact.related('instruments').sync(toSync)
  //   }

  //   await contact.save()
  //   return contact
  // }

  async createOrUpdate(ctx: HttpContext) {
    console.log('createOrUpdate called')
    console.log(ctx.request.all())

    const data = await ctx.request.validateUsing(createContactValidator)

    let contact: Contact // This will hold the Contact instance
    let oldValidatedStatus: boolean = false // Capture old status

    if (data.id) {
      // It's an update operation
      const foundContact = await Contact.find(data.id)
      if (!foundContact) {
        return ctx.response.notFound('Contact not found')
      }
      contact = foundContact // Assign the found contact to the 'contact' variable
      oldValidatedStatus = contact.validated // Capture old status before merging
    } else {
      // It's a creation operation
      contact = await Contact.create({ ...data, validated: true }) // Create new contact
      // For new contacts, oldValidatedStatus remains false, which is correct
    }

    // If it was an update operation (data.id existed), merge the new data.
    // If it was a creation operation, the data is already set by `Contact.create()`.
    if (data.id) {
      contact.merge({ ...data, validated: true }) // Merge new data for existing contact
    }
    // No explicit `await contact.save()` here yet, as it's at the end.

    if (data.instruments) {
      let toSync = Object.assign(
        {},
        ...data.instruments.map((instrument) => {
          return {
            [instrument.id]: {
              proficiency_level: instrument.pivot_proficiency_level,
            },
          }
        })
      )
      await contact.related('instruments').sync(toSync)
    }

    await contact.save() // Save the contact changes (both for new and updated)

    // --- NEW: Trigger Recruitment Status Update if 'validated' changes to true ---
    if (!oldValidatedStatus && contact.validated) {
      console.log(
        `LOG: Contact ID ${contact.id} validated. Attempting to update associated Recruitment status.`
      )
      await this._updateAssociatedRecruitmentStatus(contact, 'registered')
    }
    // --- END NEW ---

    return contact
  }

  async delete({ params, response }: HttpContext) {
    let contact = await Contact.find(params.id)
    if (contact) {
      let participations = await contact.related('participants').query()

      for (let participation of participations) {
        await participation.related('answers').query().delete()
        await participation.related('rehearsals').query().delete()
        await participation.delete()
      }

      await contact.delete()
      return response.send('contact deleted')
    }
    return response.send('contact not found')
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createContactValidator)

    const existing = await Contact.query()
      .where('firstname', data.first_name)
      .andWhere('lastname', data.last_name)
      .first()

    if (existing) return ctx.response.send('Contact already exists.')

    return await Contact.create(data)
  }

  async getValidation(ctx: HttpContext) {
    console.log('getValidation called')

    let baseQuery = Contact.query()
      .where('validated', false)
      .preload('instruments', (instrumentsQuery) => {
        instrumentsQuery.pivotColumns(['proficiency_level'])
      })

    return await simpleFilter(
      ctx,
      baseQuery,
      ['first_name', 'last_name', 'email', 'comments', 'messenger', 'phone'],
      [{ relationColumns: ['family', 'name'], relationName: 'instruments' }]
    )
  }

  async unsubscribe_from_mails({ request, response }: HttpContext) {
    console.log('unsubscribe_from_mails called')
    const { email }: { email: string } = request.only(['email'])
    let contact = await Contact.query().where('email', email).first()
    if (contact) {
      contact.subscribed = false
      await contact.save()
      return response.status(200).send('contact unsubscribed')
    }
    return response.status(404).send('contact not found')
  }

  /**
   * NEW PRIVATE METHOD: _updateAssociatedRecruitmentStatus
   * Finds the Recruitment record(s) associated with a Contact and updates its status.
   * This is now more robust by querying via Participant.
   */
  private async _updateAssociatedRecruitmentStatus(contact: Contact, newStatus: RecruitmentStatus) {
    try {
      // Find all Participant records associated with this Contact
      const participants = await Participant.query()
        .where('contact_id', contact.id)
        .select('id', 'project_id', 'section_id') // Select necessary fields for lookup
        .exec() // Execute the query

      if (participants.length === 0) {
        console.warn(
          `LOG: No Participant records found for Contact ID ${contact.id}. No Recruitment status updated.`
        )
        return // Nothing to do if no participants are linked
      }

      let updatedRecruitmentsCount = 0

      // Iterate through each participant to find their associated recruitment
      for (const participant of participants) {
        // Find the Recruitment record that matches this Contact's name AND this Participant's project
        // This is still a name-based match, but now narrowed by project_id for better accuracy.
        // A direct `contact_id` on Recruitment would be ideal, but we're working with current schema.
        const recruitmentToUpdate = await Recruitment.query()
          .where('firstName', contact.first_name)
          .andWhere('lastName', contact.last_name)
          .andWhere('projectId', participant.project_id) // Match by project ID
          .where('status', 'pending validation' as RecruitmentStatus) // Only update if currently pending validation
          .first() // Assuming one unique pending recruitment per name+project combination

        if (recruitmentToUpdate) {
          recruitmentToUpdate.status = newStatus
          await recruitmentToUpdate.save()
          updatedRecruitmentsCount++
          console.log(
            `LOG: Recruitment ID ${recruitmentToUpdate.id} status updated to '${newStatus}' due to Contact validation.`
          )
        } else {
          console.warn(
            `LOG: No 'pending validation' Recruitment found for Contact ID ${contact.id} (Participant ID: ${participant.id}, Project ID: ${participant.project_id}). Status not updated.`
          )
        }
      }
      console.log(
        `LOG: Finished updating recruitments for Contact ID ${contact.id}. Total updated: ${updatedRecruitmentsCount}`
      )
    } catch (error) {
      console.error(
        'ERROR: Failed to update associated Recruitment status on Contact validation:',
        error
      )
    }
  }
}
