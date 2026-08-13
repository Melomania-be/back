import { test } from '@japa/runner'

test.group('Users API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin'
    })
    return response.body().token
  }

  // Test 1: Unauthenticated access returns 401
  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/users')
    response.assertStatus(401)
  })

  // Test 2: Get all users returns 200 for authenticated user
  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/users')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 3: Get current user returns 200
  test('should return current user for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get('/users/current')
      .bearerToken(token)
    response.assertStatus(200)
  })

  // Test 4: Create user with missing fields returns 422
  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/users')
      .bearerToken(token)
      .json({})
    response.assertStatus(422)
  })

  // Test 5: Create user with valid data
  test('should create a user with valid data', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .put('/users')
      .bearerToken(token)
      .json({
        email: 'testuser@test.com',
        password: 'password123',
        password_confirmation: 'password123',
        fullName: 'Test User'
      })
    response.assertStatus(200)
  })

  // Test 6: Delete a non-existent user
  test('should handle deleting non-existent user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .delete('/users/99999')
      .bearerToken(token)
    response.assertStatus(200)
  })
})