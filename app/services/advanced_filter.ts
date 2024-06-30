import { HttpContext } from '@adonisjs/core/http'
import { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Knex } from 'knex'
import { ExtractModelRelations, RelationshipsContract } from '@adonisjs/lucid/types/relations'
import string from '@adonisjs/core/helpers/string'
import { advancedFilterValidator } from '#validators/advanced_filter'

export async function advancedFilter<Model extends LucidModel>(
  { request }: HttpContext,
  Model: Model,
  baseQuery: ModelQueryBuilderContract<Model, InstanceType<Model>>,
  options?: {
    filtered?: boolean
    paginated?: boolean
    ordered?: boolean
  }
) {
  options = {
    filtered: options?.filtered ?? true,
    paginated: options?.paginated ?? true,
    ordered: options?.ordered ?? true,
  }
  if (Model !== baseQuery.model) {
    throw new Error('The model and the baseQuery must be the same')
  }

  const { filters, limit, page, order, orderBy } =
    await request.validateUsing(advancedFilterValidator)

  let bddRequest = baseQuery

  if (options?.filtered !== false && filters && filters.filtersDepth1.length > 0) {
    const processedFilters: {
      type: string
      filtersDepth1: {
        type: string
        filtersDepth2: {
          relation: RelationshipsContract
          asserter: {
            [column: string]: Knex.ColumnInfo
          }
          operation: string
          column: string
          filter: string
        }[]
      }[]
    } = {
      type: filters.type,
      filtersDepth1: [],
    }

    if (filters?.filtersDepth1) {
      for (const group of filters?.filtersDepth1) {
        const processedGroup: {
          type: string
          filtersDepth2: {
            relation: RelationshipsContract
            asserter: {
              [column: string]: Knex.ColumnInfo
            }
            operation: string
            column: string
            filter: string
          }[]
        } = { type: group.type, filtersDepth2: [] }

        if (group.filtersDepth2) {
          for (const filter of group.filtersDepth2) {
            const relation = Model.$getRelation(filter.relation)

            const asserter = relation
              ? await relation
                  .relatedModel()
                  .$adapter.modelClient(new relation.model())
                  .columnsInfo(relation.relatedModel().table)
              : await Model.$adapter.modelClient(new Model()).columnsInfo(Model.table)

            processedGroup.filtersDepth2.push({
              relation: relation,
              asserter: asserter,
              operation: filter.operation,
              column: filter.column,
              filter: filter.filter,
            })
          }
        }

        processedFilters.filtersDepth1.push(processedGroup)
      }
    }
    for (const group of processedFilters.filtersDepth1) {
      if (processedFilters.type === 'and') {
        bddRequest.andWhere((query) => {
          for (const filter of group.filtersDepth2) {
            if (group.type === 'and') {
              queryAndWhere(query, filter)
            } else if (group.type === 'or') {
              queryOrWhere(query, filter)
            }
          }
        })
      } else if (processedFilters.type === 'or') {
        bddRequest.orWhere((query) => {
          for (const filter of group.filtersDepth2) {
            if (group.type === 'and') {
              queryAndWhere(query, filter)
            } else if (group.type === 'or') {
              queryOrWhere(query, filter)
            }
          }
        })
      }
    }
  }

  if (
    options?.ordered !== false &&
    orderBy &&
    orderBy !== '' &&
    (order === 'asc' || order === 'desc')
  ) {
    bddRequest.orderBy(string.snakeCase(orderBy), order)
  } else {
    bddRequest.orderBy('id', 'asc')
  }

  if (options?.paginated !== false && limit && page) {
    return bddRequest.paginate(page, limit)
  } else if (limit) {
    return bddRequest.limit(limit)
  }

  return bddRequest
}

function queryAndWhere<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model, InstanceType<Model>>,
  filter: {
    relation: RelationshipsContract | string
    asserter: {
      [column: string]: Knex.ColumnInfo
    }
    operation: string
    column: string
    filter: string
  }
) {
  if (!filter.relation) {
    if (filter.asserter[filter.column]) {
      query.orWhere(filter.column, filter.operation, filter.filter)
    } else {
      throw new Error('The column does not exist')
    }
  } else {
    if (filter.relation && typeof filter.relation !== 'string') {
      const relationName = filter.relation.relationName as ExtractModelRelations<
        InstanceType<Model>
      >
      if (filter.asserter[filter.column]) {
        query.andWhereHas(relationName, (subQuery) => {
          subQuery.where(filter.column, filter.operation, filter.filter)
        })
      } else {
        throw new Error('The column does not exist')
      }
    }
  }

  return query
}

function queryOrWhere<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model, InstanceType<Model>>,
  filter: {
    relation: RelationshipsContract | string
    asserter: {
      [column: string]: Knex.ColumnInfo
    }
    operation: string
    column: string
    filter: string
  }
) {
  if (!filter.relation) {
    if (filter.asserter[filter.column]) {
      query.orWhere(filter.column, filter.operation, filter.filter)
    } else {
      throw new Error('The column does not exist')
    }
  } else {
    if (filter.relation && typeof filter.relation !== 'string') {
      const relationName = filter.relation.relationName as ExtractModelRelations<
        InstanceType<Model>
      >
      if (filter.asserter[filter.column]) {
        query.orWhereHas(relationName, (subQuery) => {
          subQuery.where(filter.column, filter.operation, filter.filter)
        })
      } else {
        throw new Error('The column does not exist')
      }
    }
  }

  return query
}
