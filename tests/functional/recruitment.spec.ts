import { test } from '@japa/runner'

test.group('Recruitment API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  // Test 1: Unauthenticated access returns 401
  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/projects/1/management/recruitment/settings')
    response.assertStatus(401)
  })

  // Test 2: Get settings for non-existent project returns 404
  test('should return 404 for non-existent project settings', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/recruitment/settings')
      .bearerToken(token)
    response.assertStatus(404)
  })

  // Test 3: Get contacts for non-existent project returns 200 with empty data
  test('should return 200 for recruitment contacts on non-existent project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/recruitment/contacts')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 4: Get stats for non-existent project
  test('should return stats for non-existent project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/recruitment/stats')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 5: Get available projects returns 200
  test('should return available projects for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/recruitment/import-project')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 6: Delete non-existent recruitment contact returns 404
  test('should return 404 when deleting non-existent recruitment contact', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .delete('/projects/99999/management/recruitment/contacts/99999')
      .bearerToken(token)
    response.assertStatus(404)
  })
})