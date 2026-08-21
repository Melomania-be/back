import { test } from '@japa/runner'
import Project from '#models/project'
import User from '#models/user'

test.group('Accounting API', (group) => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  let testProjectId: number

  group.setup(async () => {
    const admin = await User.findByOrFail('email', 'admin@admin.admin')
    const project = await Project.create({
      name: 'Accounting Test Project',
      organizationId: admin.organizationId,
    })
    testProjectId = project.id
  })

  group.teardown(async () => {
    await Project.query().where('id', testProjectId).delete()
  })

  test('should return 200 for authenticated user on accounting categories', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/accounting_categories').bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 401 for unauthenticated access to accounting categories', async ({
    client,
  }) => {
    const response = await client.get('/accounting_categories')
    response.assertStatus(401)
  })

  test('should fail to create a category when name is missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.post('/accounting_categories').bearerToken(token).json({})
    response.assertStatus(400)
  })

  test('should return 404 when deleting a non-existent category', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.delete('/accounting_categories/99999').bearerToken(token)
    response.assertStatus(404)
  })

  test('should return accounting settings for a valid project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get(`/projects/${testProjectId}/management/accounting/settings`)
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should return 404 for accounting settings of a non-existent project', async ({
    client,
  }) => {
    const token = await getToken(client)
    const response = await client
      .get('/projects/99999/management/accounting/settings')
      .bearerToken(token)
    response.assertStatus(404)
  })

  test('should return 200 for accounting entries of a valid project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get(`/projects/${testProjectId}/management/accounting`)
      .bearerToken(token)
    response.assertStatus(200)
  })

  test('should fail to create an entry when name is missing', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post(`/projects/${testProjectId}/management/accounting`)
      .bearerToken(token)
      .json({ amount: 100 })
    response.assertStatus(400)
  })

  test('should fail to create an entry when amount is zero', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .post(`/projects/${testProjectId}/management/accounting`)
      .bearerToken(token)
      .json({ name: 'Test entry', amount: 0 })
    response.assertStatus(400)
  })

  test('should return 404 when deleting a non-existent accounting entry', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .delete(`/projects/${testProjectId}/management/accounting/99999`)
      .bearerToken(token)
    response.assertStatus(404)
  })
})
