import { BaseSeeder } from '@adonisjs/lucid/seeders'

import Organization from '#models/organization'
import ContractorCategory from '#models/contractor_category'

export default class extends BaseSeeder {
  async run() {
    await Organization.firstOrCreate({
      name: 'Independent',
    })

    const categories = [
      'Concert hall managers',
      'Orchestra managers',
      'Graphic designers',
      'Photographers',
      'Sound engineers',
      'Logistics',
    ]

    for (const category of categories) {
      await ContractorCategory.firstOrCreate({
        name: category,
      })
    }
  }
}