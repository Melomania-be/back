/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const UsersController = () => import('#controllers/users_controller')
const ComposersController = () => import('#controllers/composers_controller')
const PiecesController = () => import('#controllers/pieces_controller')
const ContactsController = () => import('#controllers/contacts_controller')
const RegistrationsController = () => import('#controllers/registrations_controller')
const CallsheetsController = () => import('#controllers/callsheets_controller')
const RecommendSomeonesController = () => import('#controllers/recommend_someones_controller')
const ProjectsController = () => import('#controllers/projects_controller')
const FilesController = () => import('#controllers/files_controller')
const FoldersController = () => import('#controllers/folders_controller')
const ParticipantsController = () => import('#controllers/participants_controller')
const TypeOfPiecesController = () => import('#controllers/type_of_pieces_controller')
const InstrumentsController = () => import('#controllers/instruments_controller')
const MailingsController = () => import('#controllers/mailings_controller')
const ListsController = () => import('#controllers/lists_controller')
const SectionGroupsController = () => import('#controllers/section_groups_controller')

router
  .group(() => {
    //open routes
    router.group(() => {
      router.get('/', async () => {
        return {
          henlo: 'monde',
        }
      })
      router.get('/registration/:id', [RegistrationsController, 'getOne'])
      router.put('/registration/submit', [RegistrationsController, 'submit'])

      router.post('/sign_in', [UsersController, 'signIn'])
      router.post('/recommend_someone', [RecommendSomeonesController, 'create'])

      router.get('/call_sheets/:id/:visitorId', [CallsheetsController, 'getOne'])
    })

    //protected routes
    router
      .group(() => {
        router.group(() => {
          router.get('/composer', [ComposersController, 'getAll'])
          router.put('/composer', [ComposersController, 'createOrUpdate'])
          router.delete('/composer/:id', [ComposersController, 'delete'])
        })

        router.group(() => {
          router.get('/piece', [PiecesController, 'getAll'])
          router.put('/piece', [PiecesController, 'createOrUpdate'])
          router.delete('/piece/:id', [PiecesController, 'delete'])
        })

        router.group(() => {
          router.get('projects/management/registration', [RegistrationsController, 'getAll'])
          router.get('projects/management/registration/:id', [RegistrationsController, 'getOne'])
          router.post('projects/management/registration', [RegistrationsController, 'create'])
        })

        router.group(() => {
          router.get('/projects/management/call_sheets', [CallsheetsController, 'getAll'])
          //router.get('/projects/management/call_sheets/:id', [CallsheetsController, 'getOne'])
          router.post('/projects/management/call_sheets/', [CallsheetsController, 'create'])
        })

        router.group(() => {
          router.get('/recommend_someone', [RecommendSomeonesController, 'getAll'])
          router.get('/recommend_someone/:id', [RecommendSomeonesController, 'getOne'])
          router.delete('/recommend_someone/:id', [RecommendSomeonesController, 'delete'])
        })

        router.group(() => {
          router.get('/projects', [ProjectsController, 'getAll'])
          router.get('/projects/management/:id', [ProjectsController, 'getDashboard'])
          router.get('/projects/:id', [ProjectsController, 'getOne'])
          router.post('/projects', [ProjectsController, 'create'])
        })

        router.group(() => {
          router.get('/projects/management/:id/participants', [ParticipantsController, 'getAll'])
          router.post('/projects/management/:id/participants/link', [
            ParticipantsController,
            'create',
          ])
          router.patch('/projects/management/:id/participants/unlink/:participantId', [
            ParticipantsController,
            'unlinkParticipant',
          ])
          router.get('/projects/management/:id/participants/unique/:participantId', [
            ParticipantsController,
            'getOne',
          ])
          router.patch('/projects/management/:id/participants/unique/:participantId', [
            ParticipantsController,
            'modify',
          ])
          router.get('/projects/management/:id/validation', [
            ParticipantsController,
            'getApplications',
          ])
          router.patch('/projects/management/:id/validation/:participantId', [
            ParticipantsController,
            'validateParticipant',
          ])
          router.delete('/projects/management/:id/participants/:participantId', [
            ParticipantsController,
            'delete',
          ])
        })

        router.group(() => {
          router.get('/type_of_pieces', [TypeOfPiecesController, 'getAll'])
          router.put('/type_of_pieces', [TypeOfPiecesController, 'createOrUpdate'])
          router.delete('/type_of_pieces/:id', [TypeOfPiecesController, 'delete'])
        })

        router.group(() => {
          router.post('/files', [FilesController, 'upload'])
          router.get('/files', [FilesController, 'getAll'])
          router.delete('/files/:id', [FilesController, 'delete'])
          router.get('/files/download/:id', [FilesController, 'download'])
        })

        router.group(() => {
          router.put('/folders', [FoldersController, 'create'])
          router.post('/folders', [FoldersController, 'update'])
          router.get('/folders', [FoldersController, 'getAll'])
          router.delete('/folders/:id', [FoldersController, 'delete'])
        })

        router.group(() => {
          router.get('/contact', [ContactsController, 'getAll'])
          router.get('/contact/validation', [ContactsController, 'getValidation'])
          router.get('/contact/:id', [ContactsController, 'getOne'])
          router.put('/contact', [ContactsController, 'createOrUpdate'])
          router.delete('/contact/:id', [ContactsController, 'delete'])
          router.post('contact', [ContactsController, 'advancedSearch'])
        })

        router.group(() => {
          router.get('/instrument', [InstrumentsController, 'getAll'])
          router.put('/instrument', [InstrumentsController, 'createOrUpdate'])
          router.delete('/instrument/:id', [InstrumentsController, 'delete'])
        })

        router.group(() => {
          router.get('users', [UsersController, 'getAll'])
          router.put('users', [UsersController, 'create'])
          router.delete('users/:id', [UsersController, 'delete'])
        })

        router.post('/mailing', [MailingsController, 'send'])

        router.get('/sign_out', [UsersController, 'signOut'])

        router.get('/verify', async ({ response }) => {
          response.ok({ authentificated: true })
        })

        router.group(() => {
          router.get('/lists', [ListsController, 'getAll'])
          router.get('/lists/:id', [ListsController, 'getOne'])
          router.put('/lists', [ListsController, 'createOrUpdate'])
          router.delete('/lists/:id', [ListsController, 'delete'])
        })

        router.group(() => {
          router.get('/sectionGroups', [SectionGroupsController, 'getAll'])
          router.get('/sectionGroups/:id', [SectionGroupsController, 'getOne'])
          router.put('/sectionGroups', [SectionGroupsController, 'createOrUpdate'])
        })
      })

      .use(
        middleware.auth({
          guards: ['api'],
        })
      )
  })
  .use(middleware.routeLogger())
