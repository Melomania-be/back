import { test } from '@japa/runner'

test.group('Lists API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/lists')
    response.assertStatus(401)
  })

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/lists').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for invalid list ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/lists/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/lists')
      .bearerToken(token)
      .json({})
    response.assertStatus(422)
  })

  test('should create a list with valid data', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/lists')
      .bearerToken(token)
      .json({
        name: `Test List ${Date.now()}`,
        contacts: []
      })
    response.assertStatus(200)
  })

  test('should return 404 when deleting non-existent list', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/lists/99999').bearerToken(token)
    response.assertStatus(404)
  })
})