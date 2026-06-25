import { DateTime } from 'luxon'
import {
	BaseModel,
	belongsTo,
	column,
	hasMany
} from '@adonisjs/lucid/orm'
import type {
        BelongsTo,
        HasMany
} from '@adonisjs/lucid/types/relations'

import ContractorContact from '#models/contractor_contact'
import ContractorInteractionFile from '#models/contractor_interaction_file'


export default class ContractorInteraction extends BaseModel {
	@column({ isPrimary: true })
	declare id: number

	@column()
	declare contractorContactId: number

	@column.date()
	declare interactionDate: DateTime

	@column()
	declare description: string

	@belongsTo(() => ContractorContact)
	declare contractor: BelongsTo<typeof ContractorContact>

	@hasMany(() => ContractorInteractionFile, {
  foreignKey: 'contractorInteractionId',
})
declare files: HasMany<typeof ContractorInteractionFile>

	@column.dateTime({ autoCreate: true })
	declare createdAt: DateTime

	@column.dateTime({ autoCreate: true, autoUpdate: true })
	declare updatedAt: DateTime
}