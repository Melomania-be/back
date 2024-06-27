import { LucidRow, LucidModel } from '@adonisjs/lucid/types/model'
import { ModelRelations } from '@adonisjs/lucid/types/relations'

export type ExtractModelRawRelations<Row extends LucidRow> = {
  [Key in keyof Row]: Row[Key] extends ModelRelations<LucidModel, LucidModel>
    ? Row[Key]['__opaque_type'] extends 'hasOne' | 'belongsTo'
      ? Row[Key]['model']
      : never
    : never
}[keyof Row]
