import { getAllValidator } from '#validators/getter'
import { HttpContext } from '@adonisjs/core/http'
import { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Knex } from 'knex'
import PostgresDataNumbers from '../postgres_data_type/postgres_data_number.js'
import PostgresDataStrings from '../postgres_data_type/postgres_data_string.js'
import { ExtractModelRawRelations } from '../types/model_relation_extractor.js'
import { ExtractModelColumns } from '../types/model_columns_extractor.js'
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations'
import { ExtractModel } from '../types/model_extractor.js'
import string from '@adonisjs/core/helpers/string'

/**
 * This function allows to easily get all the data from a table with filters, pagination and ordering iwth just the request and the type of data that you want to get
  @param {HttpContext} ctx context of the request
  @param {Filter<Model, Model>} columnFilter filter to apply to the main model
  @param {{
   columns: ExtractModelColumns<InstanceType<Model>>[] & string[]
   relations?: ExtractModelRelations<InstanceType<Model>>[]
  }} select
  @param {RelationFilter<Model, ExtractModelRelations<InstanceType<Model>>>[]} relationFilters
  @param {{
   filtered?: boolean
   paginated?: boolean
   ordered?: boolean
  }} options
  **/

export async function getAll<Model extends LucidModel>(
  { request }: HttpContext,
  Model: Model,
  baseQuery: ModelQueryBuilderContract<Model, InstanceType<Model>>,
  columnFilter?: Filter<Model, Model>,
  relationFilters?: RelationFilter<Model, ExtractModelRelations<InstanceType<Model>>>[],
  options?: {
    filtered?: boolean
    paginated?: boolean
    ordered?: boolean
  }
): Promise<ModelQueryBuilderContract<Model, InstanceType<Model>>> {
  options = {
    filtered: options?.filtered ?? true,
    paginated: options?.paginated ?? true,
    ordered: options?.ordered ?? true,
  }
  const { filter, limit, page, order, orderBy } = await request.validateUsing(getAllValidator)

  let bddRequest = baseQuery

  if (options?.filtered !== false && filter && filter !== '') {
    if (columnFilter?.columnsToFilter.length === 0) {
      throw new Error('You must provide at least one column to filter')
    }

    if (columnFilter) {
      const asserter = await columnFilter.model.$adapter
        .modelClient(new columnFilter.model())
        .columnsInfo(columnFilter.model.table)

      columnFilter.columnsToFilter.forEach(async (column) => {
        if (isColumnNumber(asserter, column) && !Number.isNaN(Number(filter))) {
          bddRequest = bddRequest.orWhere(column, filter)
        } else if (isColumnString(asserter, column)) {
          bddRequest = bddRequest.orWhere(column, 'like', `%${filter}%`)
        }
      })
    }

    for (const relation of relationFilters ?? []) {
      const asserter = await relation.model.$adapter
        .modelClient(new relation.model())
        .columnsInfo(relation.model.table)

      for (const column of relation.columnsToFilter) {
        if (isColumnNumber(asserter, column) && !Number.isNaN(Number(filter))) {
          bddRequest = bddRequest.orWhereHas(relation.relationName, (query) => {
            query.where(column, filter)
          })
        } else if (isColumnString(asserter, column)) {
          bddRequest = bddRequest.orWhereHas(relation.relationName, (query) => {
            query.where(column, 'like', `%${filter}%`)
          })
        }
      }
    }
  }

  if (
    options?.ordered !== false &&
    orderBy &&
    orderBy !== '' &&
    (order === 'asc' || order === 'desc')
  ) {
    bddRequest = bddRequest.orderBy(string.snakeCase(orderBy), order)
  } else {
    bddRequest = bddRequest.orderBy('id', 'asc')
  }

  if (options?.paginated !== false && limit && page) {
    return bddRequest.paginate(page, limit)
  } else if (limit) {
    return bddRequest.limit(limit)
  }

  return bddRequest
}

function isColumnNumber(
  asserter: {
    [column: string]: Knex.ColumnInfo
  },
  test: any
): test is String {
  if (PostgresDataNumbers.includes(asserter[camelCaseToSnake(test)].type)) {
    return true
  } else {
    return false
  }
}

function isColumnString(
  asserter: {
    [column: string]: Knex.ColumnInfo
  },
  test: any
): test is String {
  if (PostgresDataStrings.includes(asserter[camelCaseToSnake(test)].type)) {
    return true
  } else {
    return false
  }
}

function camelCaseToSnake(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * This class allows to easily filter the data of a model using the getAll function
 */
export class Filter<
  Model extends LucidModel,
  SubModel extends ExtractModelRawRelations<InstanceType<Model>> | Model,
> {
  model: SubModel
  columnsToFilter: [
    ExtractModelColumns<InstanceType<SubModel>>,
    ...ExtractModelColumns<InstanceType<SubModel>>[],
  ]
  constructor(
    model: SubModel,
    columnsToFilter: [
      ExtractModelColumns<InstanceType<SubModel>>,
      ...ExtractModelColumns<InstanceType<SubModel>>[],
    ]
  ) {
    this.model = model
    this.columnsToFilter = columnsToFilter
  }
}

/**
 * This class allows to easily filter the data of a relation using the getAll function
 */
export class RelationFilter<
  Model extends LucidModel,
  RelationName extends ExtractModelRelations<InstanceType<Model>>,
> {
  relationName: RelationName
  model: ExtractModel<InstanceType<Model>, RelationName>
  columnsToFilter: [
    ExtractModelColumns<InstanceType<ExtractModel<InstanceType<Model>, RelationName>>>,
    ...ExtractModelColumns<InstanceType<ExtractModel<InstanceType<Model>, RelationName>>>[],
  ]
  constructor(
    relationName: RelationName,
    model: ExtractModel<InstanceType<Model>, RelationName>,
    columnsToFilter: [
      ExtractModelColumns<InstanceType<ExtractModel<InstanceType<Model>, RelationName>>>,
      ...ExtractModelColumns<InstanceType<ExtractModel<InstanceType<Model>, RelationName>>>[],
    ]
  ) {
    this.relationName = relationName
    this.model = model
    this.columnsToFilter = columnsToFilter
  }
}
