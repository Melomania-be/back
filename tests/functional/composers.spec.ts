import { test } from '@japa/runner'

test.group('Composers API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/composer')
    response.assertStatus(401)
  })

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/composer').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for invalid composer pieces ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/composer/99999/pieces').bearerToken(token)
    response.assertStatus(404)
  })

  test('should create a composer with valid data', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/composer')
      .bearerToken(token)
      .json({
        short_name: `TestComp${Date.now()}`,
        long_name: 'Test Composer',
        birth_date: -5364662400000,
        death_date: -3786825600000,
        country: 'France',
        main_style: 'Classical'
      })
    response.assertStatus(200)
  })

  test('should return 404 when deleting non-existent composer', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/composer/99999').bearerToken(token)
    response.assertStatus(404)
  })
})