import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
 
  protected tenantTables = [
  // Accounting
    'accounting_categories',
    'accounting_entries',
    'accounting_settings',
    'expense_categories',
    
    // Core Entities
    'projects',
    'concerts',
    'rehearsals',
    'callsheets',
    'content_callsheets',
    'pieces',
    'composers',
    'materials',
    
    // Participants & Contacts
    'participants',
    'contacts',
    'responsibles',
    
    // Auditions & Registrations
    'auditions',
    'audition_files',
    'audition_pdf_files',
    'registrations',
    'content_registrations',
    'forms',
    'answers',
    
    // Recruitment
    'recruitment_contacts',
    'recruitment_recommendations',
    'recruitment_settings',
    'recommendeds',
    
    // Organization & Files
    'section_groups',
    'sections',
    'section_pdfs',
    'files',
    'folders',
    'shared_folders',
    'saves',
    
    // Communication
    'lists',
    'outgoing_mails',
    'mail_templates'
  ]

  async up() {
    for (const tableName of this.tenantTables) {
      this.schema.alterTable(tableName, (table) => {
        // defaultTo(1) safely assigns existing data to your default tenant
        table.integer('organization_id')
             .unsigned()
             .notNullable()
             .defaultTo(1)
             .references('id')
             .inTable('organizations')
             .onDelete('CASCADE')
      })
    }
  }

  async down() {
    for (const tableName of this.tenantTables) {
      this.schema.alterTable(tableName, (table) => {
        table.dropColumn('organization_id')
      })
    }
  }
}