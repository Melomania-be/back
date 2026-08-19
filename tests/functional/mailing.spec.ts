import { test } from '@japa/runner'

// Helper to get an auth token
async function getToken(client: any) {
  const response = await client.post('/sign_in').json({
    email: 'admin@admin.admin',
    password: 'admin'
  })
  return response.body().token
}

test.group('Mailing API', () => {

  // Test unauthenticated access
  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/mailing/templates/default')
    response.assertStatus(401)
  })

  // Test authenticated access
  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/mailing/templates/default')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test invalid ID
  test('should return 404 for invalid ID', async ({ client }) => {
    const response = await client.get('/mailing/templates/99999')
    response.assertStatus(404)
  })

  // Test validation
  test('should return 400 when type or contactIds are invalid', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/mailing/sendMailToIndividualContacts')
      .bearerToken(token)
      .json({
        contactIds: [1, 2, 3],
        type: '',
        templateId: 1,
        subject: 'Test Subject',
        content: 'Test content'})
    response.assertStatus(400)
  })

})