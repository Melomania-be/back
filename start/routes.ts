/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuditionsController = () => import('#controllers/auditions_controller')
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
const FormsController = () => import('#controllers/forms_controller')
const SectionsController = () => import('#controllers/sections_controller')
const TemplateController = () => import('#controllers/template_controller')
const DefaultTemplatesController = () => import('#controllers/default_templates_controller')
const AccountingCategoriesController = () => import('#controllers/accounting_categories_controller')
const AccountingsController = () => import('#controllers/accounting_controller')
const FilesystemController = () => import('#controllers/filesystem_controller')
const SharedFolderController = () => import('#controllers/shared_folder_controller')
const RecruitmentController = () => import('#controllers/recruitment_controller')
const RecruitmentRecommendationController = () => import('#controllers/recruitment_recommendation_controller')
const TasksController = () => import('#controllers/tasks_controller')

// Lignes masquées temporairement (PR de Kwesi)
// const ProfilesController = () => import('#controllers/profiles_controller')
// const PasswordRecoveriesController = () => import('#controllers/password_recoveries_controller')

router.group(() => {
  // =============================================================================
  // ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
  // =============================================================================

  router.get('/', async () => {
    return { henlo: 'monde' }
  })

  router.post('/sign_in', [UsersController, 'signIn'])

  router.get('/files/download/:id', [FilesController, 'download'])
  router.get('/files/stream/:id', [FilesController, 'stream'])
  router.get('/files/info/:id', [FilesController, 'info'])

  router
    .group(() => {
      router.get('/:token', [SharedFolderController, 'getSharedFolder'])
      router.get('/:token/folder/:folderId', [SharedFolderController, 'getSharedSubfolder'])
      router.get('/:token/download/:fileId', [SharedFolderController, 'downloadSharedFile'])
    })
    .prefix('/shared/folders')

  router.post('/recommend_someone', [RecommendSomeonesController, 'create'])
  router.get('/registration/:id', [RegistrationsController, 'getOne'])
  router.put('/registration/submit', [RegistrationsController, 'submit'])
  router.get('/registration/:id/forms', [FormsController, 'getFromProject'])
  router.get('/call_sheets/:id/:visitorId', [CallsheetsController, 'getOne'])
  router.put('/unsubscribe', [ContactsController, 'unsubscribe_from_mails'])

  // Routes de Kwesi masquées temporairement
  // router.post('/forgot-password', [PasswordRecoveriesController, 'forgotPassword'])
  // router.post('/reset-password', [PasswordRecoveriesController, 'resetPassword'])

  router
    .group(() => {
      router.get('/:token', [AuditionsController, 'getAuditionPage'])
      router.post('/:token/upload', [AuditionsController, 'uploadAuditionFile'])
      router.post('/:token/save-notes', [AuditionsController, 'saveTemporaryNotes'])
      router.post('/:token/submit', [AuditionsController, 'submitAudition'])
      router.delete('/:token/files/:fileId', [AuditionsController, 'deleteAuditionFile'])
      router.get('/:token/pdfs', [AuditionsController, 'getAuditionPdfs'])
      router.get('/:token/pdf/:pdfFileId/download', [AuditionsController, 'downloadAuditionPdf'])
    })
    .prefix('/audition')

  router.get('/projects/:id/recommend', [RecruitmentRecommendationController, 'getRecommendationPage'])
  router.post('/projects/:id/recommend', [RecruitmentRecommendationController, 'submitRecommendation'])
  router.get('/projects/:id/recommend/success', [RecruitmentRecommendationController, 'confirmationPage'])

  // =============================================================================
  // ROUTES PROTÉGÉES (AVEC AUTHENTIFICATION)
  // =============================================================================
  router
    .group(() => {
      router.get('/verify', async ({ response }) => {
        response.ok({ authentificated: true })
      })

      router.get('/sign_out', [UsersController, 'signOut'])

      // =============================================================================
      // GESTION DES TÂCHES (TASK MANAGER)
      // =============================================================================
      router
        .group(() => {
          router.get('/stats', [TasksController, 'stats'])
          router.get('/', [TasksController, 'index'])
          router.post('/', [TasksController, 'store'])
          router.put('/:id', [TasksController, 'update'])
          router.patch('/:id/status', [TasksController, 'patchStatus'])
          router.delete('/:id', [TasksController, 'destroy']) // Met à la corbeille
          router.post('/:id/restore', [TasksController, 'restore']) // Sort de la corbeille

        })
        .prefix('/tasks')

      const MaterialsController = () => import('#controllers/materials_controller')

      router
        .group(() => {
          router.get('/piece/:pieceId', [MaterialsController, 'getByPiece'])
          router.get('/:id', [MaterialsController, 'getOne'])
          router.post('/', [MaterialsController, 'create'])
          router.put('/:id', [MaterialsController, 'update'])
          router.delete('/:id', [MaterialsController, 'delete'])
          router.post('/:id/duplicate', [MaterialsController, 'duplicate'])
          router.post('/:id/set-default', [MaterialsController, 'setAsDefault'])
          router.post('/assign', [MaterialsController, 'assignToProject'])
          router.post('/assign-bulk', [MaterialsController, 'assignBulk'])
          router.get('/project/:projectId/unspecified', [MaterialsController, 'getUnspecifiedMaterials'])
          router.post('/:id/files', [MaterialsController, 'uploadFiles'])
        })
        .prefix('/materials')

      const PieceMaterialsController = () => import('#controllers/piece_materials_controller')

      router
        .group(() => {
          router.post('/:pieceId/select-material', [PieceMaterialsController, 'selectMaterial'])
          router.get('/:pieceId/select-material', [PieceMaterialsController, 'getSelectedMaterial'])
        })
        .prefix('/pieces')

      router
        .group(() => {
          router.get('/projects/:id', [FilesystemController, 'getProjectStructure'])
          router.post('/projects/:id/init', [FilesystemController, 'initProjectStructure'])
          router.post('/projects/:id/sync-pieces', [FilesystemController, 'syncPieceFolders'])
          router.get('/folders/:id/contents', [FilesystemController, 'getFolderContents'])
          router.post('/folders', [FilesystemController, 'createFolder'])
          router.delete('/folders/:id', [FilesystemController, 'deleteFolder'])
          router.patch('/folders/:id', [FilesystemController, 'renameFolder'])
          router.post('/folders/:id/share', [SharedFolderController, 'createShare'])
          router.get('/folders/:id/share-status', [SharedFolderController, 'getShareStatus'])
          router.delete('/folders/:id/share', [SharedFolderController, 'revokeShare'])
          router.post('/upload', [FilesystemController, 'uploadFiles'])
          router.get('/files/:id/check-deletion', [FilesystemController, 'checkFileDeletion'])
          router.delete('/files/:id', [FilesystemController, 'deleteFile'])
          router.patch('/files/:id', [FilesystemController, 'renameFile'])
          router.get('/general', [FilesystemController, 'getGeneralFiles'])
          router.get('/pieces/:pieceId/scores/:fileName', [FilesystemController, 'getPieceScores'])
        })
        .prefix('/filesystem')

      router
        .group(() => {
          router.get('/', [AccountingCategoriesController, 'getAll'])
          router.post('/', [AccountingCategoriesController, 'createOrUpdate'])
          router.delete('/:id', [AccountingCategoriesController, 'delete'])
        })
        .prefix('/accounting_categories')

      router
        .group(() => {
          router.get('/', [AccountingCategoriesController, 'getAll'])
          router.post('/', [AccountingCategoriesController, 'createOrUpdate'])
          router.delete('/:id', [AccountingCategoriesController, 'delete'])
        })
        .prefix('/expense_categories')

      router
        .group(() => {
          router.get('/:contactId', [AccountingsController, 'getContactAccountings'])
          router.post('/attachment', [AccountingsController, 'uploadAttachment'])
          router.get('/attachment/:filename', [AccountingsController, 'downloadAttachment'])
        })
        .prefix('/accountings')

      router
        .group(() => {
          router.get('/', [ProjectsController, 'getAll'])
          router.post('/', [ProjectsController, 'createOrUpdate'])
          router.get('/:id', [ProjectsController, 'getOne'])
          router.delete('/:id', [ProjectsController, 'delete'])
          router.get('/:id/management', [ProjectsController, 'getDashboard'])
          router.get('/:id/management/attendance', [ProjectsController, 'getAttendance'])

          router
            .group(() => {
              router.get('/settings', [AccountingsController, 'getSettings'])
              router.put('/settings', [AccountingsController, 'updateSettings'])
              router.get('/', [AccountingsController, 'getAll'])
              router.post('/', [AccountingsController, 'createOrUpdate'])
              router.delete('/:accountingId', [AccountingsController, 'delete'])
              router.put('/entries/:entryId/status', [AccountingsController, 'updateStatus'])
              router.get('/categories', [AccountingsController, 'getCategories'])
              router.post('/categories', [AccountingsController, 'createOrUpdateCategory'])
              router.delete('/categories/:categoryId', [AccountingsController, 'deleteCategory'])
              router.get('/stats', [AccountingsController, 'getStats'])
              router.get('/participant', [AccountingsController, 'getContactAccountingsproject'])
            })
            .prefix('/:id/management/accounting')

          router.get('/:id/material-selections', [PieceMaterialsController, 'getProjectMaterialSelections'])
          router.post('/:id/sync-material-selections', [PieceMaterialsController, 'syncWithCallsheets'])
          router.get('/:id/assigned-materials', [MaterialsController, 'getProjectAssignedMaterials'])

          router
            .group(() => {
              router.get('/settings', [RecruitmentController, 'getSettings'])
              router.put('/settings', [RecruitmentController, 'updateSettings'])
              router.post('/auto-import-all', [RecruitmentController, 'autoImportAllContacts'])
              router.get('/contacts', [RecruitmentController, 'getContacts'])
              router.get('/', [RecruitmentController, 'getContacts'])
              router.post('/contacts/manual', [RecruitmentController, 'createManualContact'])
              router.post('/contacts', [RecruitmentController, 'createManualContact'])
              router.post('/contacts/import', [RecruitmentController, 'importContacts'])
              router.put('/contacts/:contactId/status', [RecruitmentController, 'updateContactStatus'])
              router.put('/contacts/:contactId', [RecruitmentController, 'updateContactStatus'])
              router.delete('/contacts/:contactId', [RecruitmentController, 'deleteContact'])
              router.post('/search-contacts', [RecruitmentController, 'searchContacts'])
              router.post('/send-recommendation-email', [RecruitmentController, 'sendRecommendationEmail'])
              router.post('/send-emails', [RecruitmentController, 'sendRecruitmentEmails'])
              router.get('/import-project', [RecruitmentController, 'getAvailableProjects'])
              router.post('/import-project', [RecruitmentController, 'importFromProject'])
              router.get('/recommendations', [RecruitmentController, 'getRecommendations'])
              router.post('/recommendations/:recommendationId/handle', [RecruitmentController, 'handleRecommendation'])
              router.get('/stats', [RecruitmentController, 'getStats'])
            })
            .prefix('/:id/management/recruitment')

          router
            .group(() => {
              router.get('/', [ParticipantsController, 'getAll'])
              router.post('/', [ParticipantsController, 'createOrUpdate'])
              router.get('/answers', [ParticipantsController, 'getParticipantsAnswers'])
              router.get('/:participantId', [ParticipantsController, 'getOne'])
              router.delete('/:participantId', [ParticipantsController, 'delete'])
              router.post('/:participantId/request-audition', [AuditionsController, 'requestAudition'])
            })
            .prefix('/:id/management/participants')

          router
            .group(() => {
              router.get('/', [AuditionsController, 'getProjectAuditions'])
              router.delete('/:auditionId', [AuditionsController, 'deleteAudition'])
              router.post('/upload-pdf', [AuditionsController, 'uploadPdfForAudition'])
              router.post('/upload-pdf-section', [AuditionsController, 'uploadPdfForSection'])
              router.get('/pdfs', [AuditionsController, 'getProjectPdfs'])
              router.get('/section-pdfs', [AuditionsController, 'getProjectPdfs'])
              router.post('/bulk-send-pdfs', [AuditionsController, 'bulkSendPdfsToSection'])
              router.delete('/pdf/:pdfFileId', [AuditionsController, 'deleteAuditionPdf'])
              router.delete('/section-pdfs/:pdfFileId', [AuditionsController, 'removePdfFromSection'])
              router.get('/debug-files', [AuditionsController, 'debugFiles'])
            })
            .prefix('/:id/management/auditions')

          router
            .group(() => {
              router.get('/', [ParticipantsController, 'getApplications'])
              router.post('/', [ParticipantsController, 'validateParticipant'])
            })
            .prefix('/:id/management/validation')

          router
            .group(() => {
              router.delete('/', [RegistrationsController, 'delete'])
              router.post('/', [RegistrationsController, 'createOrUpdate'])
            })
            .prefix('/:id/management/registration')

          router
            .group(() => {
              router.get('/', [CallsheetsController, 'getAll'])
              router.get('/:callsheetId', [CallsheetsController, 'getOne'])
              router.post('/', [CallsheetsController, 'createOrUpdate'])
              router.delete('/:callsheetId', [CallsheetsController, 'delete'])
            })
            .prefix('/:id/management/call_sheets')

          router
            .group(() => {
              router.get('/', [MailingsController, 'getOutgoing'])
            })
            .prefix('/:id/management/mailing')
        })
        .prefix('/projects')

      router
        .group(() => {
          router.get('/', [ComposersController, 'getAll'])
          router.get('/:id/pieces', [ComposersController, 'getPieces'])
          router.put('/', [ComposersController, 'createOrUpdate'])
          router.delete('/:id', [ComposersController, 'delete'])
        })
        .prefix('/composer')

      router
        .group(() => {
          router.get('/', [PiecesController, 'getAll'])
          router.put('/', [PiecesController, 'createOrUpdate'])
          router.delete('/:id', [PiecesController, 'delete'])
        })
        .prefix('/piece')

      router
        .group(() => {
          router.get('/', [TypeOfPiecesController, 'getAll'])
          router.put('/', [TypeOfPiecesController, 'createOrUpdate'])
          router.delete('/:id', [TypeOfPiecesController, 'delete'])
        })
        .prefix('/type_of_pieces')

      router
        .group(() => {
          router.post('/', [FilesController, 'upload'])
          router.get('/', [FilesController, 'getAll'])
          router.put('/:id', [FilesController, 'update'])
          router.delete('/:id', [FilesController, 'delete'])
          router.get('/:id/info', [FilesController, 'info'])
        })
        .prefix('/files')

      router
        .group(() => {
          router.put('/', [FoldersController, 'create'])
          router.post('/', [FoldersController, 'update'])
          router.get('/', [FoldersController, 'getAll'])
          router.delete('/:id', [FoldersController, 'delete'])
        })
        .prefix('/folders')

      router
        .group(() => {
          router.get('/', [ContactsController, 'getAll'])
          router.get('/validation', [ContactsController, 'getValidation'])
          router.post('/validation/merge', [ContactsController, 'mergeContacts'])
          router.get('/:id', [ContactsController, 'getOne'])
          router.put('/', [ContactsController, 'createOrUpdate'])
          router.delete('/:id', [ContactsController, 'delete'])
          router.post('/', [ContactsController, 'advancedSearch'])
        })
        .prefix('/contact')

      router
        .group(() => {
          router.get('/', [InstrumentsController, 'getAll'])
          router.post('/', [InstrumentsController, 'createOrUpdate'])
          router.delete('/:id', [InstrumentsController, 'delete'])
        })
        .prefix('/instrument')

      router
        .group(() => {
          router.get('/', [UsersController, 'getAll'])
          router.get('/current', [UsersController, 'getCurrentUser'])
          router.put('/', [UsersController, 'create'])
          router.patch('/:id', [UsersController, 'update'])
          router.delete('/:id', [UsersController, 'delete'])

          // Route de Kwesi masquée temporairement
          // router.patch('/profile', [ProfilesController, 'update'])
        })
        .prefix('/users')

      router
        .group(() => {
          router.get('/', [RecommendSomeonesController, 'getAll'])
          router.get('/:id', [RecommendSomeonesController, 'getOne'])
          router.delete('/:id', [RecommendSomeonesController, 'delete'])
        })
        .prefix('/recommend_someone')

      router
        .group(() => {
          router.post('/sendRefusalEmailToParticipant', [MailingsController, 'sendRefusalEmailToParticipant'])
          router.post('/sendAuditionRequest', [MailingsController, 'sendAuditionRequest'])
          router.post('/sendTemplateToList', [MailingsController, 'sendTemplateToList'])
          router.post('/sendCallsheetNotification', [MailingsController, 'sendCallsheetNotification'])
          router.post('/sendRecommendedNotification', [MailingsController, 'sendRecommendedNotification'])
          router.post('/sendRecruitmentNotification', [MailingsController, 'sendRecruitmentNotification'])
          router.post('/sendParticipationValidationNotification', [MailingsController, 'sendParticipationValidationNotification'])
          router.post('/sendMailToParticipants', [MailingsController, 'sendMailToParticipants'])
          router.post('/sendMailToIndividualContacts', [MailingsController, 'sendMailToIndividualContacts'])

          router
            .group(() => {
              router.get('/default', [DefaultTemplatesController, 'getDefaultTemplates'])
              router.put('/default/edit', [DefaultTemplatesController, 'editDefaultTemplate'])
            })
            .prefix('/templates')
        })
        .prefix('/mailing')

      router
        .group(() => {
          router.get('/', [ListsController, 'getAll'])
          router.get('/:id', [ListsController, 'getOne'])
          router.put('/', [ListsController, 'createOrUpdate'])
          router.delete('/:id', [ListsController, 'delete'])
        })
        .prefix('/lists')

      router
        .group(() => {
          router.get('/', [SectionGroupsController, 'getAll'])
          router.get('/:id', [SectionGroupsController, 'getOne'])
          router.post('/', [SectionGroupsController, 'createOrUpdate'])
          router.delete('/:id', [SectionGroupsController, 'delete'])
        })
        .prefix('/sectionGroups')

      router
        .group(() => {
          router.get('/', [SectionsController, 'getAll'])
          router.delete('/:id', [SectionsController, 'delete'])
          router.post('/', [SectionsController, 'createOrUpdate'])
        })
        .prefix('/sections')

      router
        .group(() => {
          router.get('/', [TemplateController, 'getTemplates'])
          router.put('/createOrUpdate', [TemplateController, 'createOrUpdateTemplate'])
          router.delete('/:id', [TemplateController, 'delete'])
        })
        .prefix('/templates')
    })
    .use(middleware.auth({ guards: ['api'] }))
    .use(middleware.routeLogger())
})
