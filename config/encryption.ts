import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

/**
 * Encryption configuration (required by AdonisJS 7 core). Uses the app key as
 * the single AES-256-GCM encryptor. This lab does not rely on encryption, but
 * the framework needs a valid config to boot.
 */
export default defineConfig({
  default: 'app',
  list: {
    app: drivers.aes256gcm({
      id: 'app',
      keys: [env.get('APP_KEY')],
    }),
  },
})
