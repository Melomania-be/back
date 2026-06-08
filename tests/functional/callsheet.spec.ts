import { test } from '@japa/runner'

test.group('Callsheet API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  test('should return empty array for non-existent project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/call_sheets')
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for invalid callsheet ID', async ({ client }) => {
    const response = await client.get('/call_sheets/99999/1')
    response.assertStatus(404)
  })

  test('should fail when version is missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/projects/1/management/call_sheets')
      .bearerToken(token)
      .json({
        project_id: 1,
        version: '',
        contents: [{ title: 'Test block', text: 'Test content' }]
      })
    response.assertStatus(422)
  })

  test('should return 404 when deleting non-existent callsheet', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .delete('/projects/1/management/call_sheets/99999')
      .bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 404 for invalid public callsheet ID', async ({ client }) => {
    const response = await client.get('/call_sheets/99999/99999')
    response.assertStatus(404)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/projects/99999/management/call_sheets')
    response.assertStatus(401)
  })
})