import { test } from '@japa/runner'
import User from '#models/user'
import Project from '#models/project'
import Task from '#models/task'

test.group('Tasks API', (group) => {

  // On nettoie les tâches avant chaque test
  group.each.setup(async () => {
    await Task.query().delete()
  })

  test('create a new task successfully', async ({ client }) => {
    // 1. Setup : Utilisation de firstOrCreate pour éviter l'erreur de doublon (unique constraint)
    const user = await User.firstOrCreate(
      { email: 'test1@melo.com' },
      { password: 'Password1!', fullName: 'User 1' }
    )
    const project = await Project.firstOrCreate(
      { name: 'Projet Test' },
      {}
    )

    // Génération manuelle du token OAT
    const token = await User.accessTokens.create(user)

    // 2. Action : Modification de l'URL pour correspondre à ton routeur
    const response = await client
      .post('/tasks')
      .bearerToken(token.value!.release()) // On injecte le token ici
      .json({
        title: 'Ma première tâche de test',
        projectId: project.id,
        status: 'todo'
      })

    // 3. Assertions
    response.assertStatus(200)
    response.assertBodyContains({
      title: 'Ma première tâche de test',
      status: 'todo',
      projectId: project.id,
      createdBy: user.id
    })
  })

  test('prevent IDOR: user cannot delete someone else\'s task', async ({ client, assert }) => {    // 1. Setup avec firstOrCreate
    const creator = await User.firstOrCreate(
      { email: 'creator@melo.com' },
      { password: 'Password1!', fullName: 'Creator' }
    )
    const attacker = await User.firstOrCreate(
      { email: 'attacker@melo.com' },
      { password: 'Password1!', fullName: 'Attacker' }
    )
    const project = await Project.firstOrCreate(
      { name: 'Projet Securite' },
      {}
    )

    const task = await Task.create({
      title: 'Tâche Top Secrète',
      projectId: project.id,
      createdBy: creator.id
    })

    // Génération du token pour l'attaquant
    const attackerToken = await User.accessTokens.create(attacker)

    // 2. Action : L'attaquant essaie de supprimer (URL corrigée)
    const response = await client
      .delete(`/tasks/${task.id}`)
      .bearerToken(attackerToken.value!.release()) // Session de l'attaquant

    // 3. Assertions
    response.assertStatus(403)
    const taskStillExists = await Task.find(task.id)
    assert.isNotNull(taskStillExists)
  })
})
