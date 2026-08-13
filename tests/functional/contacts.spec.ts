import { test } from '@japa/runner'

test.group('Contacts API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  // Test 1: Unauthenticated access returns 401
  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/contact')
    response.assertStatus(401)
  })

  // Test 2: Get all contacts returns 200 for authenticated user
  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 3: Get a single contact with invalid ID returns 404
  test('should return 404 for invalid contact ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact/99999')
      .bearerToken(token)
    response.assertStatus(404)
  })

  // Test 4: Create a contact with valid data
test('should create a contact with valid data', async ({ client }) => {
  const token = await getToken(client)
  const response = await client
    .put('/contact')
    .bearerToken(token)
    .json({
      first_name: 'Test',
      last_name: 'Contact',
      email: 'testcontact@test.com',
      phone: null,
      messenger: null,
      comments: null,
      validated: true,
      subscribed: true,
      instruments: []
    })
  response.assertStatus(200)
})

// Test 5: Delete a non-existent contact returns contact not found
test('should return 200 when deleting non-existent contact', async ({ client }) => {
  const token = await getToken(client)
  const response = await client
    .delete('/contact/99999')
    .bearerToken(token)
  response.assertStatus(200)
})

  // Test 6: Get validation contacts returns 200
  test('should return validation contacts for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/contact/validation')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test: Merge contacts with missing fields returns 422
test('should fail to merge contacts when required fields are missing', async ({ client }) => {
  const token = await getToken(client)
  const response = await client
    .post('/contact/validation/merge')
    .bearerToken(token)
    .json({})
  response.assertStatus(422)
})
})