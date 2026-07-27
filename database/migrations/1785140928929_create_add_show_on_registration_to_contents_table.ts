import { BaseSchema } from '@adonisjs/lucid/schema'
export default class AddShowOnRegistrationToContents extends BaseSchema {

  protected tableRegistration = 'content_registrations'
  protected tableCallsheet = 'content_callsheets'

  public async up () {
    // Vérifie et ajoute pour la première table
    const hasRegistrationCol = await this.schema.hasColumn(this.tableRegistration, 'show_on_registration')
    if (!hasRegistrationCol) {
      this.schema.alterTable(this.tableRegistration, (table) => {
        table.boolean('show_on_registration').defaultTo(false)
      })
    }

    // Vérifie et ajoute pour la deuxième table
    const hasCallsheetCol = await this.schema.hasColumn(this.tableCallsheet, 'show_on_registration')
    if (!hasCallsheetCol) {
      this.schema.alterTable(this.tableCallsheet, (table) => {
        table.boolean('show_on_registration').defaultTo(false)
      })
    }
  }

  public async down () {
    this.schema.alterTable(this.tableRegistration, (table) => {
      table.dropColumn('show_on_registration')
    })

    this.schema.alterTable(this.tableCallsheet, (table) => {
      table.dropColumn('show_on_registration')
    })
  }
}
