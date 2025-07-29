// // import type { HttpContext } from '@adonisjs/core/http'

// import Participant from '#models/participant'
// import { HttpContext } from '@adonisjs/core/http'
// import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'
// import { simpleFilter } from 'adonisjs-filters'
// import Section from '#models/section'

// export default class ParticipantsController {
//   //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants
//   async getAll(ctx: HttpContext) {
//     const baseQuery = Participant.query()
//       .preload('contact')
//       .preload('section')
//       .preload('concerts', (concertsQuery) => {
//         concertsQuery.pivotColumns(['comment'])
//       })
//       .preload('rehearsals', (rehearsalsQuery) => {
//         rehearsalsQuery.pivotColumns(['comment'])
//       })
//       .where('project_id', ctx.params.id)
//       .andWhere('accepted', true)

//     return await simpleFilter(
//       ctx,
//       baseQuery,
//       ['contact_id'],
//       [{ relationColumns: ['first_name', 'last_name'], relationName: 'contact' }]
//     )
//   }

//   //getOne : gets a participant at /projects/:id/management/participants/unique/:id
//   async getOne({ params }: HttpContext) {
//     const { id, participantId } = params
//     return await Participant.query()
//       .where('id', participantId)
//       .andWhere('project_id', id)
//       .preload('contact')
//       .preload('section')
//       .preload('answers')
//       .preload('concerts', (concertsQuery) => {
//         concertsQuery.pivotColumns(['comment'])
//       })
//       .preload('rehearsals', (rehearsalsQuery) => {
//         rehearsalsQuery.pivotColumns(['comment'])
//       })
//       .preload('project')
//       .first()
//   }

//   //createOrUpdate : creates a participant at /projects/:id/management/participants
//   // async createOrUpdate({ request, response }: HttpContext) {
//   //   const data = await request.validateUsing(createParticipantValidator)

//   //   let participant: Participant | null

//   //   if (data.id) {
//   //     participant = await Participant.find(data.id)
//   //     if (!participant) return response.abort('Participant not found')
//   //   } else {
//   //     participant = await Participant.query()
//   //       .where('project_id', data.project.id)
//   //       .andWhere('contact_id', data.contact.id)
//   //       .first()
//   //     if (participant) return response.abort('This person already is a participant')
//   //     else
//   //       participant = await Participant.create({
//   //         accepted: data.accepted,
//   //         contact_id: data.contact.id,
//   //         project_id: data.project.id,
//   //         section_id: data.section.id,
//   //         is_section_leader: data.is_section_leader,
//   //       })
//   //   }

//   //   await participant.related('section').dissociate()

//   //   const section = await Section.findOrFail(data.section.id)

//   //   await participant.related('section').associate(section)

//   //   await participant.related('answers').query().delete()

//   //   await participant.related('answers').createMany(
//   //     data.answers.map((answers) => ({
//   //       text: answers.text ? answers.text : '',
//   //       form_id: answers.formId,
//   //     }))
//   //   )

//   //   if (data.concerts) {
//   //     let toSync = Object.assign(
//   //       {},
//   //       ...data.concerts.map((concert) => {
//   //         return {
//   //           [concert.id]: {
//   //             comment: concert.pivot_comment,
//   //           },
//   //         }
//   //       })
//   //     )

//   //     await participant.related('concerts').sync(toSync)
//   //   }

//   //   if (data.rehearsals) {
//   //     let toSync = Object.assign(
//   //       {},
//   //       ...data.rehearsals.map((rehearsal) => {
//   //         return {
//   //           [rehearsal.id]: {
//   //             comment: rehearsal.pivot_comment,
//   //           },
//   //         }
//   //       })
//   //     )

//   //     await participant.related('rehearsals').sync(toSync)
//   //   }

//   //   // Update is_section_leader
//   //   if (data.id) {
//   //     participant.merge({ is_section_leader: data.is_section_leader })
//   //   }

//   //   await participant.save()

//   //   return response.send('Participant created')
//   // }

//   async createOrUpdate({ request, response }: HttpContext) {
//     const data = await request.validateUsing(createParticipantValidator)

//     let participant: Participant | null

//     if (data.id) {
//       participant = await Participant.find(data.id)
//       if (!participant) return response.abort('Participant not found')

//       // --- DEBUG LOGS START: Before any property assignment ---
//       // console.log(`\n--- Debugging Participant Update (ID: ${participant.id}) ---`)
//       // console.log(`Participant initial section_id (from DB): ${participant.section_id}`)
//       // console.log(`Incoming data.section.id from request payload: ${data.section.id}`)
//       // console.log(
//       //   `Participant initial is_section_leader (from DB): ${participant.is_section_leader}`
//       // )
//       // console.log(`Incoming data.is_section_leader from request payload: ${data.is_section_leader}`)
//       // console.log(`participant.$original (before direct changes):`, participant.$original)
//       // console.log(`participant.$dirty (before direct changes):`, participant.$dirty)
//       // --- DEBUG LOGS END ---

//       // --- CRITICAL CHANGE: Apply updates and save Participant IMMEDIATELY for dirty tracking ---
//       // Explicitly update section_id
//       if (participant.section_id !== data.section.id) {
//         console.log(
//           `ACTION: section_id is DIFFERENT. Setting participant.section_id to ${data.section.id}`
//         )
//         participant.section_id = data.section.id
//       } else {
//         console.log(
//           `INFO: section_id (${participant.section_id}) is the SAME as incoming. No change required for this property.`
//         )
//       }

//       // Explicitly update is_section_leader
//       if (participant.is_section_leader !== data.is_section_leader) {
//         console.log(
//           `ACTION: is_section_leader is DIFFERENT. Setting participant.is_section_leader to ${data.is_section_leader}`
//         )
//         participant.is_section_leader = data.is_section_leader
//       } else {
//         console.log(
//           `INFO: is_section_leader (${participant.is_section_leader}) is the SAME as incoming. No change required for this property.`
//         )
//       }

//       // --- DEBUG LOGS: Right before the FIRST save() ---
//       console.log(
//         `\n--- Before FIRST participant.save() (ID: ${participant.id}) for section_id/is_section_leader ---`
//       )
//       console.log(
//         `Current participant.section_id (after potential assignment): ${participant.section_id}`
//       )
//       console.log(
//         `Original participant.section_id (from $original): ${participant.$original.section_id}`
//       )
//       console.log(
//         `Result of participant.isDirty('section_id'): ${participant.isDirty('section_id')}`
//       )
//       console.log(`All dirty fields (participant.$dirty):`, participant.$dirty)
//       // --- END DEBUG LOGS ---

//       // Save participant here to ensure section_id change is processed by hook
//       await participant.save()
//       console.log(
//         `--- FIRST participant.save() completed for ID: ${participant.id} (section_id/is_section_leader update) ---`
//       )
//     } else {
//       // Logic for creating a new participant (no change needed here)
//       participant = await Participant.query()
//         .where('project_id', data.project.id)
//         .andWhere('contact_id', data.contact.id)
//         .first()
//       if (participant) return response.abort('This person already is a participant')
//       else {
//         participant = await Participant.create({
//           accepted: data.accepted,
//           contact_id: data.contact.id,
//           project_id: data.project.id,
//           section_id: data.section.id,
//           is_section_leader: data.is_section_leader,
//         })
//         // console.log(`\n--- Debugging Participant Creation ---`)
//         // console.log(
//         //   `New participant created with ID: ${participant.id}, section_id: ${participant.section_id}`
//         // )
//         // console.log(`--- End Debugging Participant Creation ---`)
//       }
//     }

//     // --- All other operations (answers, concerts, rehearsals) go AFTER the primary participant.save() ---

//     await participant.related('answers').query().delete()
//     await participant.related('answers').createMany(
//       data.answers.map((answers) => ({
//         text: answers.text ? answers.text : '',
//         form_id: answers.formId,
//       }))
//     )

//     if (data.concerts) {
//       let toSync = Object.assign(
//         {},
//         ...data.concerts.map((concert) => {
//           return {
//             [concert.id]: {
//               comment: concert.pivot_comment,
//             },
//           }
//         })
//       )
//       await participant.related('concerts').sync(toSync)
//     }

//     if (data.rehearsals) {
//       let toSync = Object.assign(
//         {},
//         ...data.rehearsals.map((rehearsal) => {
//           return {
//             [rehearsal.id]: {
//               comment: rehearsal.pivot_comment,
//             },
//           }
//         })
//       )
//       await participant.related('rehearsals').sync(toSync)
//     }

//     // --- Final Save for any changes from sync operations (e.g., updatedAt) ---
//     if (participant.isDirty) {
//       // Checks if any field is dirty (like updatedAt after syncs)
//       // console.log(
//       //   `\n--- Before FINAL participant.save() for ID: ${participant.id} (after syncs) ---`
//       // )
//       console.log(`All dirty fields (participant.$dirty):`, participant.$dirty)
//       console.log(`Has any field changed (participant.isDirty): ${participant.isDirty}`)
//       await participant.save()
//       // console.log(
//       //   `--- FINAL participant.save() completed for ID: ${participant.id} (after syncs) ---`
//       // )
//     } else {
//       // console.log(
//       //   `\n--- No further changes detected for Participant ID: ${participant.id} after syncs. Skipping final save. ---`
//       // )
//     }

//     return response.send('Participant updated')
//   }

//   //delete : deletes a participant from the given project at /projects/:id/management/participants/:id
//   async delete({ params, response }: HttpContext) {
//     const { id, participantId } = params
//     const participant = await Participant.query()
//       .where('id', participantId)
//       .andWhere('project_id', id)
//       .first()

//     if (!participant) {
//       return response.send("Can't find this participant in this project")
//     }

//     await participant.delete()
//     return response.send('Participant deleted from the project')
//   }

//   async getParticipantsCountBySection(ctx: HttpContext) {
//     const projectId = ctx.params.id

//     // On construit la requête sur Participant
//     const baseQuery = Participant.query()
//       .where('project_id', projectId)
//       .andWhere('accepted', true)
//       .select('section_id')
//       .count('id as participants_count')
//       .groupBy('section_id')
//       .preload('section', (query) => {
//         query.select('id', 'name')
//       })

//     const counts = await baseQuery

//     // On mappe le résultat pour ne garder que l'essentiel
//     const result = counts.map((item) => ({
//       section_id: item.section_id,
//       section_name: item.section ? item.section.name : null,
//       participants_count: Number(item.$extras.participants_count) || 0,
//     }))

//     return result
//   }
// }

// import type { HttpContext } from '@adonisjs/core/http'

import Participant from '#models/participant'

import { HttpContext } from '@adonisjs/core/http'

import { createParticipantValidator, validateParticipantValidator } from '#validators/participant'

import { simpleFilter } from 'adonisjs-filters'

import Section from '#models/section'

export default class ParticipantsController {
  //getAll : gets list of all of the (accepted) participants of this project at /projects/:id/management/participants

  async getAll(ctx: HttpContext) {
    const baseQuery = Participant.query()

      .preload('contact')

      .preload('section')

      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })

      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })

      .where('project_id', ctx.params.id)

      .andWhere('accepted', true)

    return await simpleFilter(
      ctx,

      baseQuery,

      ['contact_id'],

      [{ relationColumns: ['first_name', 'last_name'], relationName: 'contact' }]
    )
  } //getOne : gets a participant at /projects/:id/management/participants/unique/:id

  async getOne({ params }: HttpContext) {
    const { id, participantId } = params

    return await Participant.query()

      .where('id', participantId)

      .andWhere('project_id', id)

      .preload('contact')

      .preload('section')

      .preload('answers')

      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })

      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })

      .preload('project')

      .first()
  } //createOrUpdate : creates a participant at /projects/:id/management/participants

  // async createOrUpdate({ request, response }: HttpContext) {
  //   const data = await request.validateUsing(createParticipantValidator)

  //   let participant: Participant | null

  //   if (data.id) {
  //     participant = await Participant.find(data.id)

  //     if (!participant) return response.abort('Participant not found')
  //   } else {
  //     participant = await Participant.query()

  //       .where('project_id', data.project.id)

  //       .andWhere('contact_id', data.contact.id)

  //       .first()

  //     if (participant) return response.abort('This person already is a participant')
  //     else
  //       participant = await Participant.create({
  //         accepted: data.accepted,

  //         contact_id: data.contact.id,

  //         project_id: data.project.id,

  //         section_id: data.section.id,

  //         is_section_leader: data.is_section_leader,
  //       })
  //   }

  //   await participant.related('section').dissociate()

  //   const section = await Section.findOrFail(data.section.id)

  //   await participant.related('section').associate(section)

  //   await participant.related('answers').query().delete()

  //   await participant.related('answers').createMany(
  //     data.answers.map((answers) => ({
  //       text: answers.text ? answers.text : '',

  //       form_id: answers.formId,
  //     }))
  //   )

  //   if (data.concerts) {
  //     let toSync = Object.assign(
  //       {},

  //       ...data.concerts.map((concert) => {
  //         return {
  //           [concert.id]: {
  //             comment: concert.pivot_comment,
  //           },
  //         }
  //       })
  //     )

  //     await participant.related('concerts').sync(toSync)
  //   }

  //   if (data.rehearsals) {
  //     let toSync = Object.assign(
  //       {},

  //       ...data.rehearsals.map((rehearsal) => {
  //         return {
  //           [rehearsal.id]: {
  //             comment: rehearsal.pivot_comment,
  //           },
  //         }
  //       })
  //     )

  //     await participant.related('rehearsals').sync(toSync)
  //   } // Update is_section_leader

  //   if (data.id) {
  //     participant.merge({ is_section_leader: data.is_section_leader })
  //   }

  //   await participant.save()

  //   return response.send('Participant created')
  // }

  async createOrUpdate({ request, response }: HttpContext) {
    const data = await request.validateUsing(createParticipantValidator)

    let participant: Participant | null

    if (data.id) {
      participant = await Participant.find(data.id)
      if (!participant) return response.abort('Participant not found')

      // --- DEBUG LOGS START: Before any property assignment ---
      // console.log(`\n--- Debugging Participant Update (ID: ${participant.id}) ---`)
      // console.log(`Participant initial section_id (from DB): ${participant.section_id}`)
      // console.log(`Incoming data.section.id from request payload: ${data.section.id}`)
      // console.log(
      //   `Participant initial is_section_leader (from DB): ${participant.is_section_leader}`
      // )
      // console.log(`Incoming data.is_section_leader from request payload: ${data.is_section_leader}`)
      // console.log(`participant.$original (before direct changes):`, participant.$original)
      // console.log(`participant.$dirty (before direct changes):`, participant.$dirty)
      // --- DEBUG LOGS END ---

      // --- CRITICAL CHANGE: Apply updates and save Participant IMMEDIATELY for dirty tracking ---
      // Explicitly update section_id
      if (participant.section_id !== data.section.id) {
        console.log(
          `ACTION: section_id is DIFFERENT. Setting participant.section_id to ${data.section.id}`
        )
        participant.section_id = data.section.id
      } else {
        console.log(
          `INFO: section_id (${participant.section_id}) is the SAME as incoming. No change required for this property.`
        )
      }

      // Explicitly update is_section_leader
      if (participant.is_section_leader !== data.is_section_leader) {
        console.log(
          `ACTION: is_section_leader is DIFFERENT. Setting participant.is_section_leader to ${data.is_section_leader}`
        )
        participant.is_section_leader = data.is_section_leader
      } else {
        console.log(
          `INFO: is_section_leader (${participant.is_section_leader}) is the SAME as incoming. No change required for this property.`
        )
      }

      // --- DEBUG LOGS: Right before the FIRST save() ---
      console.log(
        `\n--- Before FIRST participant.save() (ID: ${participant.id}) for section_id/is_section_leader ---`
      )
      console.log(
        `Current participant.section_id (after potential assignment): ${participant.section_id}`
      )
      console.log(
        `Original participant.section_id (from $original): ${participant.$original.section_id}`
      )
      console.log(
        `Result of participant.isDirty('section_id'): ${participant.isDirty('section_id')}`
      )
      console.log(`All dirty fields (participant.$dirty):`, participant.$dirty)
      // --- END DEBUG LOGS ---

      // Save participant here to ensure section_id change is processed by hook
      await participant.save()
      console.log(
        `--- FIRST participant.save() completed for ID: ${participant.id} (section_id/is_section_leader update) ---`
      )
    } else {
      // Logic for creating a new participant (no change needed here)
      participant = await Participant.query()
        .where('project_id', data.project.id)
        .andWhere('contact_id', data.contact.id)
        .first()
      if (participant) return response.abort('This person already is a participant')
      else {
        participant = await Participant.create({
          accepted: data.accepted,
          contact_id: data.contact.id,
          project_id: data.project.id,
          section_id: data.section.id,
          is_section_leader: data.is_section_leader,
        })
        // console.log(`\n--- Debugging Participant Creation ---`)
        // console.log(
        //   `New participant created with ID: ${participant.id}, section_id: ${participant.section_id}`
        // )
        // console.log(`--- End Debugging Participant Creation ---`)
      }
    }

    // --- All other operations (answers, concerts, rehearsals) go AFTER the primary participant.save() ---

    await participant.related('answers').query().delete()
    await participant.related('answers').createMany(
      data.answers.map((answers) => ({
        text: answers.text ? answers.text : '',
        form_id: answers.formId,
      }))
    )

    if (data.concerts) {
      let toSync = Object.assign(
        {},
        ...data.concerts.map((concert) => {
          return {
            [concert.id]: {
              comment: concert.pivot_comment,
            },
          }
        })
      )
      await participant.related('concerts').sync(toSync)
    }

    if (data.rehearsals) {
      let toSync = Object.assign(
        {},
        ...data.rehearsals.map((rehearsal) => {
          return {
            [rehearsal.id]: {
              comment: rehearsal.pivot_comment,
            },
          }
        })
      )
      await participant.related('rehearsals').sync(toSync)
    }

    // --- Final Save for any changes from sync operations (e.g., updatedAt) ---
    if (participant.isDirty) {
      // Checks if any field is dirty (like updatedAt after syncs)
      // console.log(
      //   `\n--- Before FINAL participant.save() for ID: ${participant.id} (after syncs) ---`
      // )
      console.log(`All dirty fields (participant.$dirty):`, participant.$dirty)
      console.log(`Has any field changed (participant.isDirty): ${participant.isDirty}`)
      await participant.save()
      // console.log(
      //   `--- FINAL participant.save() completed for ID: ${participant.id} (after syncs) ---`
      // )
    } else {
      // console.log(
      //   `\n--- No further changes detected for Participant ID: ${participant.id} after syncs. Skipping final save. ---`
      // )
    }

    return response.send('Participant updated')
  }

  //  //getApplications : gets list of all contacts that want to be participants at /projects/:id/management/validation

  async getApplications({ params }: HttpContext) {
    return await Participant.query()

      .where('project_id', params.id)

      .andWhere('accepted', false)

      .preload('contact')

      .preload('section')

      .preload('answers', (query) => query.preload('form'))

      .preload('concerts', (concertsQuery) => {
        concertsQuery.pivotColumns(['comment'])
      })

      .preload('rehearsals', (rehearsalsQuery) => {
        rehearsalsQuery.pivotColumns(['comment'])
      })
  } //validateParticipant : transforms the accepted field to true at /projects/:id/management/validation/:id

  async validateParticipant({ request, response }: HttpContext) {
    const data = await request.validateUsing(validateParticipantValidator)

    const participant = await Participant.query()

      .where('id', data.id)

      .andWhere('project_id', data.params.id)

      .first()

    if (!participant) return response.send("Couldn't find the participant")

    participant.accepted = true

    await participant.save()

    return response.send('Participant validated')
  }

  //delete : deletes a participant from the given project at /projects/:id/management/participants/:id

  async delete({ params, response }: HttpContext) {
    const { id, participantId } = params

    const participant = await Participant.query()

      .where('id', participantId)

      .andWhere('project_id', id)

      .first()

    if (!participant) {
      return response.send("Can't find this participant in this project")
    }

    await participant.delete()

    return response.send('Participant deleted from the project')
  }

  async getParticipantsCountBySection(ctx: HttpContext) {
    const projectId = ctx.params.id // On construit la requête sur Participant

    const baseQuery = Participant.query()

      .where('project_id', projectId)

      .andWhere('accepted', true)

      .select('section_id')

      .count('id as participants_count')

      .groupBy('section_id')

      .preload('section', (query) => {
        query.select('id', 'name')
      })

    const counts = await baseQuery // On mappe le résultat pour ne garder que l'essentiel

    const result = counts.map((item) => ({
      section_id: item.section_id,

      section_name: item.section ? item.section.name : null,

      participants_count: Number(item.$extras.participants_count) || 0,
    }))

    return result
  }
}
