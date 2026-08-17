import { test } from '@japa/runner'
import Project from '#models/project'

test.group('Callsheet API', (group) => {
  async function getToken(client: any) {
    const response = await client.post('/sign_in').json({
      email: 'admin@admin.admin',
      password: 'admin',
    })
    return response.body().token
  }

  let testProjectId: number

  group.setup(async () => {
    const project = await Project.create({ name: 'Callsheet Test Project' })
    testProjectId = project.id
  })

  group.teardown(async () => {
    await Project.query().where('id', testProjectId).delete()
  })

  test('should return empty array for non-existent project', async ({ client }) => {
    const token = await getToken(client)
    const response = await client.get('/projects/99999/management/call_sheets').bearerToken(token)
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
        contents: [{ title: 'Test block', text: 'Test content' }],
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

  test('should return the correct callsheet via the management route', async ({ client }) => {
    const token = await getToken(client)

    const createResponse = await client
      .post(`/projects/${testProjectId}/management/call_sheets`)
      .bearerToken(token)
      .json({
        project_id: testProjectId,
        version: 'regression-test',
        contents: [{ title: 'Regression block', text: 'Regression content' }],
      })
    const callsheetId = createResponse.body()[0].callsheetId

    const getResponse = await client
      .get(`/projects/${testProjectId}/management/call_sheets/${callsheetId}`)
      .bearerToken(token)
    getResponse.assertStatus(200)
    getResponse.assertBodyContains({ id: callsheetId })

    await client
      .delete(`/projects/${testProjectId}/management/call_sheets/${callsheetId}`)
      .bearerToken(token)
  })

  test('should create a callsheet with valid data', async ({ client }) => {
    const token = await getToken(client)

    const response = await client
      .post(`/projects/${testProjectId}/management/call_sheets`)
      .bearerToken(token)
      .json({
        project_id: testProjectId,
        version: 'create-test',
        contents: [{ title: 'Create block', text: 'Create content' }],
      })
    response.assertStatus(200)
    response.assertBodyContains([{ title: 'Create block', text: 'Create content' }])

    const callsheetId = response.body()[0].callsheetId
    await client
      .delete(`/projects/${testProjectId}/management/call_sheets/${callsheetId}`)
      .bearerToken(token)
  })

  test('should delete an existing callsheet', async ({ client }) => {
    const token = await getToken(client)

    const createResponse = await client
      .post(`/projects/${testProjectId}/management/call_sheets`)
      .bearerToken(token)
      .json({
        project_id: testProjectId,
        version: 'delete-test',
        contents: [{ title: 'Delete block', text: 'Delete content' }],
      })
    const callsheetId = createResponse.body()[0].callsheetId

    const deleteResponse = await client
      .delete(`/projects/${testProjectId}/management/call_sheets/${callsheetId}`)
      .bearerToken(token)
    deleteResponse.assertStatus(204)

    const getResponse = await client
      .get(`/projects/${testProjectId}/management/call_sheets/${callsheetId}`)
      .bearerToken(token)
    getResponse.assertStatus(404)
  })

  test('should return 404 for invalid callsheet ID on the management route', async ({ client }) => {
    const token = await getToken(client)
    const response = await client
      .get(`/projects/${testProjectId}/management/call_sheets/99999`)
      .bearerToken(token)
    response.assertStatus(404)
  })
})
