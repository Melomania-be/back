import { defineConfig, stores } from '@adonisjs/limiter'

export default defineConfig({
    default: 'db',
    stores: {
        db: stores.database({
            tableName: 'rate_limits',
            connectionName: 'postgres',
        }),
    },
})
