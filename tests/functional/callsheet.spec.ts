import { test } from '@japa/runner'
import User from '#models/user' // Ajout de l'import du modèle User

test.group('Callsheet API', () => {

  // Nouvelle fonction infaillible pour récupérer un token
  async function getAuthToken() {
    // 1. On s'assure que l'utilisateur existe
    const user = await User.firstOrCreate(
      { email: 'admin@admin.admin' },
      { password: 'Password1!', fullName: 'Admin' }
    )

    // 2. On génère un token OAT directement sans passer par la route HTTP
    const token = await User.accessTokens.create(user)
    return token.value!.release()
  }

  test('should return empty array for non-existent project', async ({ client }) => {
    const token = await getAuthToken() // Utilisation de la nouvelle fonction
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
    const token = await getAuthToken() // Utilisation de la nouvelle fonction
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
    const token = await getAuthToken() // Utilisation de la nouvelle fonction
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