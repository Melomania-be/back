import { test } from '@japa/runner'

test.group('Project API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/projects').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for invalid project ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/projects/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.post('/projects').bearerToken(token).json({})
    response.assertStatus(422)
  })

  test('should return 200 when deleting non-existent project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/projects/99999').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for management dashboard of invalid project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/projects/99999/management').bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 404 for attendance of invalid project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/projects/99999/management/attendance').bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/projects')
    response.assertStatus(401)
  })
})
