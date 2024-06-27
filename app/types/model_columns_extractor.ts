import { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import { ModelRelations } from '@adonisjs/lucid/types/relations'

export type ExtractModelColumns<Model extends LucidRow> = {
  [Key in keyof Model]: Model[Key] extends ModelRelations<LucidModel, LucidModel>
    ? never
    : Key extends keyof LucidRow
      ? never
      : Key
}[keyof Model]
