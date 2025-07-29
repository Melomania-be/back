import { DateTime } from 'luxon'
import {
  BaseModel,
  belongsTo,
  column,
  hasMany,
  manyToMany,
  afterDelete,
  afterUpdate,
  beforeUpdate,
} from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Project from '#models/project'
import Section from '#models/section'
import Answer from '#models/answer'
import Contact from '#models/contact'
import Rehearsal from '#models/rehearsal'
import Callsheet from './callsheet.js'
import Concert from './concert.js'
import Recruitment, { RecruitmentStatus } from '#models/recruitment'

export default class Participant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare last_activity: Date

  @column()
  declare accepted: boolean

  @column()
  declare project_id: number

  @column()
  declare contact_id: number

  @column()
  declare section_id: number

  @column()
  declare is_section_leader: boolean

  #sectionIdWasChanged: boolean = false
  #isSectionLeaderWasChanged: boolean = false

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => Section, {
    foreignKey: 'section_id',
  })
  declare section: BelongsTo<typeof Section>

  @belongsTo(() => Contact, {
    foreignKey: 'contact_id',
  })
  declare contact: BelongsTo<typeof Contact>

  @manyToMany(() => Rehearsal, {
    pivotTable: 'participates_ins',
    pivotForeignKey: 'participant_id',
    pivotRelatedForeignKey: 'rehearsal_id',
    pivotColumns: ['comment'],
    pivotTimestamps: true,
  })
  declare rehearsals: ManyToMany<typeof Rehearsal>

  @manyToMany(() => Concert, {
    pivotTable: 'participates_in_concerts',
    pivotForeignKey: 'participant_id',
    pivotRelatedForeignKey: 'concert_id',
    pivotColumns: ['comment'],
    pivotTimestamps: true,
  })
  declare concerts: ManyToMany<typeof Concert>

  @manyToMany(() => Callsheet, {
    pivotTable: 'seens',
    pivotTimestamps: true,
  })
  declare hasSeenCallsheets: ManyToMany<typeof Callsheet>

  @hasMany(() => Answer, {
    foreignKey: 'participant_id',
  })
  declare answers: HasMany<typeof Answer>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  serializeExtras() {
    return { pivot_comment: this.$extras.pivot_comment }
  }

  /**
   * AdonisJS Model Hook: Triggered before a Participant record is updated.
   * This hook sets flags to indicate if section_id or is_section_leader were changed,
   * which can then be used in the afterUpdate hook.
   */
  @beforeUpdate()
  static async captureDirtyState(participant: Participant) {
    // Check if section_id is dirty at this point (before save)
    ;(participant as any).#sectionIdWasChanged = participant.isDirty('section_id')
    if ((participant as any).#sectionIdWasChanged) {
      console.log(
        `LOG: Participant ID ${participant.id} (beforeUpdate): section_id was dirty. Flag #sectionIdWasChanged set to TRUE.`
      )
    } else {
      console.log(
        `LOG: Participant ID ${participant.id} (beforeUpdate): section_id was NOT dirty. Flag #sectionIdWasChanged set to FALSE.`
      )
    }

    // Check if is_section_leader is dirty at this point (before save)
    ;(participant as any).#isSectionLeaderWasChanged = participant.isDirty('is_section_leader')
    if ((participant as any).#isSectionLeaderWasChanged) {
      console.log(
        `LOG: Participant ID ${participant.id} (beforeUpdate): is_section_leader was dirty. Flag #isSectionLeaderWasChanged set to TRUE.`
      )
    } else {
      console.log(
        `LOG: Participant ID ${participant.id} (beforeUpdate): is_section_leader was NOT dirty. Flag #isSectionLeaderWasChanged set to FALSE.`
      )
    }
  }

  /**
   * AdonisJS Model Hook: Triggered after a Participant record is deleted.
   * This hook will find the associated Recruitment record and update its status to 'cancelled'.
   */
  @afterDelete()
  static async updateRecruitmentStatus(participant: Participant) {
    console.log('--- Participant afterDelete hook triggered ---')
    console.log('Participant ID being deleted:', participant.id)
    console.log('Participant contact_id:', participant.contact_id)
    console.log('Participant project_id:', participant.project_id)

    // Ensure we have the necessary IDs to find the corresponding Recruitment.
    if (participant.contact_id === null || participant.project_id === null) {
      console.warn(
        `WARN: Participant ID ${participant.id} is missing contact_id or project_id. Skipping Recruitment status update.`
      )
      return
    }

    try {
      // Fetch the associated Contact to get their first and last name.
      const contact = await Contact.find(participant.contact_id)
      console.log('Attempted to find Contact with ID:', participant.contact_id)

      if (!contact) {
        console.warn(
          `WARN: Contact ID ${participant.contact_id} not found for Participant ID ${participant.id}. Cannot update Recruitment status.`
        )
        return
      }
      console.log('Found Contact:', contact.first_name, contact.last_name)

      // Find the Recruitment record that matches the deleted participant's contact and project.
      const recruitmentQuery = Recruitment.query()
        .where('firstName', contact.first_name)
        .andWhere('lastName', contact.last_name)
        .andWhere('projectId', participant.project_id)
        .whereIn('status', [
          'registered',
          'participating',
          'awaiting response',
          'interested',
          'not yet contacted',
          'to follow up',
        ])

      // console.log('Querying for Recruitment with:')
      // console.log('  firstName:', contact.first_name)
      // console.log('  lastName:', contact.last_name)
      // console.log('  projectId:', participant.project_id)
      // console.log('   status in:', [
      //   'registered',
      //   'participating',
      //   'awaiting response',
      //   'interested',
      //   'not yet contacted',
      //   'to follow up',
      // ])

      const recruitment = await recruitmentQuery.first()

      if (recruitment) {
        console.log(
          `LOG: Found Recruitment ID ${recruitment.id} with current status: ${recruitment.status}. Updating...`
        )
        recruitment.status = 'cancelled' as RecruitmentStatus
        recruitment.comment = `Recruitment cancelled due to deletion of associated participant`
        recruitment.contactDate = DateTime.now().toUTC()
        recruitment.contactedBy = null

        await recruitment.save()
        console.log(`LOG: Recruitment ID ${recruitment.id} status updated to 'cancelled'.`)
      } else {
        console.log(
          `LOG: No active recruitment found matching criteria for Participant ID ${participant.id}. No recruitment status updated.`
        )
      }
    } catch (error) {
      console.error(
        `ERROR: Failed to update Recruitment status for Participant ID ${participant.id} on deletion:`,
        error
      )
    }
    // console.log('--- Participant afterDelete hook finished ---')
  }

  // --- NEW: afterUpdate Hook to synchronize section_id ---
  @afterUpdate()
  static async updateRecruitmentSection(participant: Participant) {
    // --- MODIFIED CONDITION: Use the flag set in beforeUpdate ---
    if (!(participant as any).#sectionIdWasChanged) {
      // Check the flag for section_id
      console.log(
        `LOG: Participant ID ${participant.id} updated, but section_id was not changed (flag #sectionIdWasChanged was FALSE). Skipping Recruitment section update.`
      )
      return
    }
    // --- END MODIFIED CONDITION ---

    // console.log(`--- Participant afterUpdate hook triggered for section_id change (via flag) ---`)
    // console.log(`Participant ID: ${participant.id}`)
    // // Note: $original here reflects the state *before the controller's first save* for section_id
    // console.log(`Old section_id (from original before save): ${participant.$original.section_id}`)
    // console.log(`New section_id (current value): ${participant.section_id}`)

    if (participant.contact_id === null || participant.project_id === null) {
      console.warn(
        `WARN: Participant ID ${participant.id} is missing contact_id or project_id. Cannot update Recruitment section.`
      )
      return
    }

    try {
      const contact = await Contact.find(participant.contact_id)
      if (!contact) {
        console.warn(
          `WARN: Contact ID ${participant.contact_id} not found for Participant ID ${participant.id}. Cannot update Recruitment section.`
        )
        return
      }
      console.log('Found Contact:', contact.first_name, contact.last_name)

      const recruitment = await Recruitment.query()
        .where('firstName', contact.first_name)
        .andWhere('lastName', contact.last_name)
        .andWhere('projectId', participant.project_id)
        .whereIn('status', [
          'registered',
          'participating',
          'awaiting response',
          'interested',
          'not yet contacted',
          'to follow up',
        ])
        .first()

      if (recruitment) {
        console.log(
          `LOG: Found Recruitment ID ${recruitment.id}. Updating section from ${recruitment.sectionId} to ${participant.section_id}.`
        )
        recruitment.sectionId = participant.section_id // Update the sectionId on the Recruitment
        await recruitment.save() // Save the changes to the Recruitment record
        console.log(`LOG: Recruitment ID ${recruitment.id} section updated successfully.`)
      } else {
        console.log(
          `LOG: No matching Recruitment found for Participant ID ${participant.id} with contact ${contact.first_name} ${contact.last_name} and project ${participant.project_id}. Recruitment section not updated.`
        )
      }
    } catch (error) {
      console.error(
        `ERROR: Failed to update Recruitment section for Participant ID ${participant.id}:`,
        error
      )
    }
    // console.log('--- Participant afterUpdate hook finished ---')
  }
}
