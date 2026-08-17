import { test } from '@japa/runner'

test.group('Folders API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/folders').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/folders')
    response.assertStatus(401)
  })

  test('should fail to create a folder when name is missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.put('/folders').bearerToken(token).json({})
    response.assertStatus(422)
  })

  test('should fail to update a folder when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.post('/folders').bearerToken(token).json({})
    response.assertStatus(422)
  })

  test('should return 404 when updating a non-existent folder', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/folders')
      .bearerToken(token)
      .json({ id: 99999, name: 'Does not exist', files: [] })
    response.assertStatus(404)
  })

  test('should return 404 when deleting a non-existent folder', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/folders/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should create, update, and delete a folder', async ({ client }) => {
    const token = await getToken(client)

    const createResponse = await client
      .put('/folders')
      .bearerToken(token)
      .json({ name: 'Test Folder' })
    createResponse.assertStatus(200)

    const folderId = createResponse.body().id

    const updateResponse = await client
      .post('/folders')
      .bearerToken(token)
      .json({ id: folderId, name: 'Test Folder Updated', files: [] })
    updateResponse.assertStatus(200)

    const deleteResponse = await client.delete(`/folders/${folderId}`).bearerToken(token)
    deleteResponse.assertStatus(200)
  })
})
