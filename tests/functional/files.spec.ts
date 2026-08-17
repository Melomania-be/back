import { test } from '@japa/runner'

test.group('Files API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/files').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/files')
    response.assertStatus(401)
  })

  test('should fail to upload when no file is provided', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.post('/files').bearerToken(token)
    response.assertStatus(422)
  })

  test('should return 404 when updating a non-existent file', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.put('/files/99999').bearerToken(token).json({})
    response.assertStatus(404)
  })

  test('should return 404 when deleting a non-existent file', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/files/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 404 for info on a non-existent file (protected route)', async ({
    client,
  }) => {
    const token = await getToken(client)
    const response = await client.get('/files/99999/info').bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 404 for the public info route on a non-existent file', async ({ client }) => {
    const response = await client.get('/files/info/99999')
    response.assertStatus(404)
  })

  test('should return 404 for downloading a non-existent file', async ({ client }) => {
    const response = await client.get('/files/download/99999')
    response.assertStatus(404)
  })

  test('should return 404 for streaming a non-existent file', async ({ client }) => {
    const response = await client.get('/files/stream/99999')
    response.assertStatus(404)
  })
})
