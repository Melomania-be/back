import { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import { ExtractModelRelations, ModelRelations } from '@adonisjs/lucid/types/relations'

export type ExtractModel<Row extends LucidRow, ColumnName extends ExtractModelRelations<Row>> =
  Row[ColumnName] extends ModelRelations<LucidModel, LucidModel> ? Row[ColumnName]['model'] : never
