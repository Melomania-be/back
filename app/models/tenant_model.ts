import {
  BaseModel,
  column,
  beforeCreate,
  beforeFind,
  beforeFetch,
  beforePaginate,
} from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { HttpContext } from '@adonisjs/core/http'

export default class TenantModel extends BaseModel {
  @column()
  declare organizationId: number

  /**
   * 1. AUTOMATIC CREATION
   * Whenever a new record is created, automatically attach the logged-in user's organization.
   */
  @beforeCreate()
  static async assignTenant(model: TenantModel) {
    const ctx = HttpContext.get()

    // Only apply if there is an active HTTP request and an authenticated user
    if (ctx && ctx.auth?.user) {
      model.organizationId = ctx.auth.user.organizationId
    }
  }

  /**
   * 2. AUTOMATIC FILTERING (READS)
   * Whenever records are queried, forcefully filter by the user's organization.
   */
  @beforeFind()
  @beforeFetch()
  @beforePaginate()
  static async filterByTenant(query: ModelQueryBuilderContract<typeof TenantModel>) {
    const ctx = HttpContext.get()

    if (ctx && ctx.auth?.user) {
      // Automatically appends "WHERE organization_id = X" to the SQL
      query.where(`${query.model.table}.organization_id`, ctx.auth.user.organizationId)
    }
  }
}
