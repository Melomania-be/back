import { test } from '@japa/runner'
import SectionGroup from '#models/section_group'

test.group('Section Groups API', () => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  test('should return 200 for authenticated user', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/sectionGroups').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 401 for unauthenticated access', async ({ client }) => {
    const response = await client.get('/sectionGroups')
    response.assertStatus(401)
  })

  test('should return 404 for invalid section group ID', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/sectionGroups/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should fail when required fields are missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.post('/sectionGroups').bearerToken(token).json({})
    response.assertStatus(422)
  })

  test('should create a section group with valid data', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post('/sectionGroups')
      .bearerToken(token)
      .json({ name: 'Test Section Group', sections: [] })
    response.assertStatus(200)

    await SectionGroup.query().where('name', 'Test Section Group').delete()
  })

  test('should return 200 when deleting a non-existent section group', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/sectionGroups/99999').bearerToken(token)
    response.assertStatus(200)
  })
})
