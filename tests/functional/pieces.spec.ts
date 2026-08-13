import { test } from '@japa/runner'

test.group('Pieces API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/piece')
    response.assertStatus(401)
  })

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/piece').bearerToken(token)
    response.assertStatus(200)
  })

  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/piece')
      .bearerToken(token)
      .json({})
    response.assertStatus(422)
  })

  test('should return 200 when deleting non-existent piece', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/piece/99999').bearerToken(token)
    response.assertStatus(200)
  })
})