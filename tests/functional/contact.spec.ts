import { test } from '@japa/runner'

test.group('Contact API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact')
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for invalid contact ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact/99999')
      .bearerToken(token)
    response.assertStatus(404)
  })

  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/contact')
      .bearerToken(token)
      .json({})
    response.assertStatus(422)
  })

  test('should return 200 for getValidation', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact/validation')
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should fail to merge contacts when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/contact/validation/merge')
      .bearerToken(token)
      .json({})
    response.assertStatus(422)
  })

  test('should return 200 when deleting non-existent contact', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .delete('/contact/99999')
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/contact')
    response.assertStatus(401)
  })
})
