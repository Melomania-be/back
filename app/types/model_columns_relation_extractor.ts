import { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import { ModelRelations } from '@adonisjs/lucid/types/relations'

export type ExtractModelColumnsWithRelation<Model extends LucidRow> = {
  [Key in keyof Model]: Model[Key] extends ModelRelations<LucidModel, LucidModel>
    ? Model[Key]['__opaque_type'] extends 'hasOne' | 'belongsTo'
      ? [
          Model[Key]['instance'],
          {
            [KeyBis in keyof Model]: Model[KeyBis] extends ModelRelations<LucidModel, LucidModel>
              ? never
              : KeyBis
          }[keyof Model],
        ]
      : never
    : never
}[keyof Model]
