import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      ALTER TABLE recruitment_contacts
      DROP CONSTRAINT IF EXISTS recruitment_contacts_status_check
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE recruitment_contacts
      ADD CONSTRAINT recruitment_contacts_status_check
      CHECK (
        status IN (
          'not_yet_contacted',
          'awaiting_response',
          'to_follow_up',
          'not_available',
          'pending_validation',
          'cancelled',
          'recruited'
        )
      )
    `)
  }
}