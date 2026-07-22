/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const EnginesController = () => import('#controllers/engines_controller')
const BenchController = () => import('#controllers/bench_controller')
const SeedController = () => import('#controllers/seed_controller')

router.get('/', async () => {
  return {
    service: 'observer',
    description: 'Multi-engine database query benchmarking lab',
    endpoints: {
      engines: 'GET /engines',
      benchmark: 'GET /bench/:engine/:queryType?indexed=&scoped=&limit=',
      compare: 'GET /bench/compare/:queryType?indexed=&scoped=&limit=',
      seed: 'POST /seed/:engine?rows=',
    },
    grafana: 'http://localhost:3001',
  }
})

router.get('/engines', [EnginesController, 'index'])
router.get('/bench/compare/:queryType', [BenchController, 'compare'])
router.get('/bench/:engine/:queryType', [BenchController, 'show'])
router.post('/seed/:engine', [SeedController, 'store'])
