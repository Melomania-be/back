import { test } from '@japa/runner'

// Helper to get an auth token
async function getToken(client: any) {
  const response = await client.post('/sign_in').json({
    email: 'admin@admin.admin',
    password: 'admin'
  })
  return response.body().token
}

test.group('Auditions API', () => {

  // Test unauthenticated access
  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/projects/16/management/auditions')
    response.assertStatus(401)
  })

  // Test authenticated access
  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/16/management/auditions')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test invalid ID
  test('should return 404 for invalid ID', async ({ client }) => {
    const response = await client.get('/99999/management/auditions/')
    response.assertStatus(404)
  })

  // Test validation
  test('should return 422 when required field is missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/projects/18/management/participants/19/request-audition')
      .bearerToken(token)
      .json({ required_files: 'file1' })
    response.assertStatus(422)
  })
})
