import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Closes the shared MongoDB client on graceful shutdown. The connection itself
 * is opened lazily on first use, so a temporarily-unavailable Mongo does not
 * block the app from booting.
 */
export default class MongoProvider {
  constructor(protected app: ApplicationService) {}

  async shutdown() {
    const { default: mongo } = await import('#services/mongo_service')
    await mongo.close()
  }
}
