import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

export default class OrganizationSeeder extends BaseSeeder {
  async run() {
    // Create the default Melomania organization
    const organization = await Organization.firstOrCreate(
      { name: 'Melomania' },
      { name: 'Melomania' }
    )

    console.log(`Organization created/found: ${organization.name} (ID: ${organization.id})`)

    // Assign all existing users to this organization
    await db.from('users').whereNull('organization_id').update({ organization_id: organization.id })
    console.log('All existing users assigned to Melomania')

    // Assign all existing data to this organization
    const tables = [
      'contacts',
      'projects',
      'lists',
      'mail_templates',
      'files',
      'folders',
      'section_groups',
      'pieces',
      'forms',
      'outgoing_mails',
      'accounting_categories',
      'accounting_settings',
      'accounting_entries',
      'recruitment_settings',
    ]

    for (const table of tables) {
      await db.from(table).whereNull('organization_id').update({ organization_id: organization.id })
      console.log(`Assigned existing ${table} to Melomania`)
    }

    console.log('Organization seeder completed successfully!')
  }
}