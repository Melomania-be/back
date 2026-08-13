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
import { throttle } from '@adonisjs/limiter/services/main'

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
const RecruitmentRecommendationController = () =>
  import('#controllers/recruitment_recommendation_controller')

// NEW IMPORTS ADDED HERE
const PasswordRecoveriesController = () => import('#controllers/password_recoveries_controller')
const ProfilesController = () => import('#controllers/profiles_controller')
const OrganizationsController = () => import('#controllers/organizations_controller')
const ContractorsController = () => import('#controllers/contractors_controller')
const ContractorCategoriesController = () => import('#controllers/contractor_categories_controller')
const ContractorParticipantsController = () =>
  import('#controllers/contractor_participants_controller')

router.group(() => {
  // =============================================================================
  // ROUTES PUBLIQUES (SANS AUTHENTIFICATION)
  // =============================================================================

  // Routes publiques générales
  router.get('/', async () => {
    return {
      henlo: 'monde',
    }
  })

  // Authentication & Password Recovery
  router.post('/sign_in', [UsersController, 'signIn'])

  router.post('/reset-password', [PasswordRecoveriesController, 'resetPassword']).use(
    throttle({
      requests: 3,
      duration: '15 mins',
      prefix: 'password_reset',
    })
  )

  // Routes fichiers publiques étendues
  router.get('/files/download/:id', [FilesController, 'download'])
  router.get('/files/stream/:id', [FilesController, 'stream'])
  router.get('/files/info/:id', [FilesController, 'info'])

  // Routes publiques pour dossiers partagés
  router
    .group(() => {
      router.get('/:token', [SharedFolderController, 'getSharedFolder'])
      router.get('/:token/folder/:folderId', [SharedFolderController, 'getSharedSubfolder'])
      router.get('/:token/download/:fileId', [SharedFolderController, 'downloadSharedFile'])
    })
    .prefix('/shared/folders')

  // Recommend someone (public)
  router.post('/recommend_someone', [RecommendSomeonesController, 'create'])

  // Registration routes (public)
  router.get('/registration/:id', [RegistrationsController, 'getOne'])
  router.put('/registration/submit', [RegistrationsController, 'submit'])

  // Forms routes (public)
  router.get('/registration/:id/forms', [FormsController, 'getFromProject'])

  // Call sheets (public access)
  router.get('/call_sheets/:id/:visitorId', [CallsheetsController, 'getOne'])

  // Contact unsubscribe (public)
  router.put('/unsubscribe', [ContactsController, 'unsubscribe_from_mails'])

  // =============================================================================
  // ROUTES PUBLIQUES POUR AUDITIONS (CANDIDATS)
  // =============================================================================
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

  // =============================================================================
  // ROUTES PUBLIQUES POUR RECOMMANDATIONS DE RECRUTEMENT
  // =============================================================================
  router.get('/projects/:id/recommend', [
    RecruitmentRecommendationController,
    'getRecommendationPage',
  ])
  router.post('/projects/:id/recommend', [
    RecruitmentRecommendationController,
    'submitRecommendation',
  ])
  router.get('/projects/:id/recommend/success', [
    RecruitmentRecommendationController,
    'confirmationPage',
  ])

  // =============================================================================
  // ROUTES PROTÉGÉES (AVEC AUTHENTIFICATION)
  // =============================================================================
  router
    .group(() => {
      // Authentication verification
      router.get('/verify', async ({ response }) => {
        response.ok({ authentificated: true })
      })

      // Sign out
      router.get('/sign_out', [UsersController, 'signOut'])

      // User Profile Update
      router.put('/profiles/:id', [ProfilesController, 'update'])

      // ============================================================================
      // GESTION DES ORGANISATIONS ET CONTRACTORS (Restored)
      // ============================================================================
      router
        .group(() => {
          router.get('/', [OrganizationsController, 'getAll'])
          router.get('/:id', [OrganizationsController, 'getOne'])
          router.post('/', [OrganizationsController, 'createOrUpdate'])
          router.delete('/:id', [OrganizationsController, 'delete'])
        })
        .prefix('/organization')

      router
        .group(() => {
          router.get('/', [ContractorsController, 'getAll'])
          router.get('/:id', [ContractorsController, 'getOne'])
          router.post('/', [ContractorsController, 'createOrUpdate'])
          router.delete('/:id', [ContractorsController, 'delete'])
        })
        .prefix('/contractor')

      router
        .group(() => {
          router.get('/', [ContractorCategoriesController, 'getAll'])
          router.post('/', [ContractorCategoriesController, 'createOrUpdate'])
          router.delete('/:id', [ContractorCategoriesController, 'delete'])
        })
        .prefix('/contractor-category')

      router
        .group(() => {
          router.get('/', [ContractorParticipantsController, 'getAll'])
          router.post('/', [ContractorParticipantsController, 'createOrUpdate'])
          router.delete('/:id', [ContractorParticipantsController, 'delete'])
        })
        .prefix('/contractor-participant')

      // ============================================================================
      // GESTION DES MATÉRIELS
      // ============================================================================
      const MaterialsController = () => import('#controllers/materials_controller')

      router
        .group(() => {
          // Matériels d'une pièce
          router.get('/piece/:pieceId', [MaterialsController, 'getByPiece'])

          // CRUD des matériels
          router.get('/:id', [MaterialsController, 'getOne'])
          router.post('/', [MaterialsController, 'create'])
          router.put('/:id', [MaterialsController, 'update'])
          router.delete('/:id', [MaterialsController, 'delete'])

          // Actions spéciales
          router.post('/:id/duplicate', [MaterialsController, 'duplicate'])
          router.post('/:id/set-default', [MaterialsController, 'setAsDefault'])

          // Assignment aux projets
          router.post('/assign', [MaterialsController, 'assignToProject'])
          router.post('/assign-bulk', [MaterialsController, 'assignBulk'])

          // Matériels non spécifiés pour un projet
          router.get('/project/:projectId/unspecified', [
            MaterialsController,
            'getUnspecifiedMaterials',
          ])

          // Upload de fichiers pour un matériel
          router.post('/:id/files', [MaterialsController, 'uploadFiles'])
        })
        .prefix('/materials')

      // ============================================================================
      // GESTION DES PIÈCES ET SÉLECTIONS DE MATÉRIELS
      // ============================================================================
      const PieceMaterialsController = () => import('#controllers/piece_materials_controller')

      router
        .group(() => {
          router.post('/:pieceId/select-material', [PieceMaterialsController, 'selectMaterial'])
          router.get('/:pieceId/select-material', [PieceMaterialsController, 'getSelectedMaterial'])
        })
        .prefix('/pieces')

      // =============================================================================
      // FILESYSTEM ROUTES
      // =============================================================================
      router
        .group(() => {
          // Project filesystem
          router.get('/projects/:id', [FilesystemController, 'getProjectStructure'])
          router.post('/projects/:id/init', [FilesystemController, 'initProjectStructure'])
          router.post('/projects/:id/sync-pieces', [FilesystemController, 'syncPieceFolders'])

          // Folders
          router.get('/folders/:id/contents', [FilesystemController, 'getFolderContents'])
          router.post('/folders', [FilesystemController, 'createFolder'])
          router.delete('/folders/:id', [FilesystemController, 'deleteFolder'])
          router.patch('/folders/:id', [FilesystemController, 'renameFolder'])

          // Gestion des partages de dossiers
          router.post('/folders/:id/share', [SharedFolderController, 'createShare'])
          router.get('/folders/:id/share-status', [SharedFolderController, 'getShareStatus'])
          router.delete('/folders/:id/share', [SharedFolderController, 'revokeShare'])

          // Files
          router.post('/upload', [FilesystemController, 'uploadFiles'])
          router.get('/files/:id/check-deletion', [FilesystemController, 'checkFileDeletion'])
          router.delete('/files/:id', [FilesystemController, 'deleteFile'])
          router.patch('/files/:id', [FilesystemController, 'renameFile'])

          // General files
          router.get('/general', [FilesystemController, 'getGeneralFiles'])

          // Piece scores for callsheet
          router.get('/pieces/:pieceId/scores/:fileName', [FilesystemController, 'getPieceScores'])
        })
        .prefix('/filesystem')

      // =============================================================================
      // GESTION DES CATEGORIES COMPTABLES
      // =============================================================================
      router
        .group(() => {
          router.get('/', [AccountingCategoriesController, 'getAll'])
          router.post('/', [AccountingCategoriesController, 'createOrUpdate'])
          router.delete('/:id', [AccountingCategoriesController, 'delete'])
        })
        .prefix('/accounting_categories')

      // =============================================================================
      // ROUTE DE COMPATIBILITÉ POUR EXPENSE_CATEGORIES (DÉPRÉCIÉ)
      // =============================================================================
      router
        .group(() => {
          router.get('/', [AccountingCategoriesController, 'getAll'])
          router.post('/', [AccountingCategoriesController, 'createOrUpdate'])
          router.delete('/:id', [AccountingCategoriesController, 'delete'])
        })
        .prefix('/expense_categories')

      // =============================================================================
      // GESTION DES COMPTABILITES GLOBALES
      // =============================================================================
      router
        .group(() => {
          router.get('/:contactId', [AccountingsController, 'getContactAccountings'])
          router.post('/attachment', [AccountingsController, 'uploadAttachment'])
          router.get('/attachment/:filename', [AccountingsController, 'downloadAttachment'])
        })
        .prefix('/accountings')

      // =============================================================================
      // GESTION DES PROJETS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [ProjectsController, 'getAll'])
          router.post('/', [ProjectsController, 'createOrUpdate'])
          router.get('/:id', [ProjectsController, 'getOne'])
          router.delete('/:id', [ProjectsController, 'delete'])
          router.get('/:id/management', [ProjectsController, 'getDashboard'])
          router.get('/:id/management/attendance', [ProjectsController, 'getAttendance'])

          // =============================================================================
          // GESTION DE LA COMPTABILITÉ
          // =============================================================================
          router
            .group(() => {
              // Paramètres de comptabilité
              router.get('/settings', [AccountingsController, 'getSettings'])
              router.put('/settings', [AccountingsController, 'updateSettings'])

              // Entrées comptables - Routes principales
              router.get('/', [AccountingsController, 'getAll'])
              router.post('/', [AccountingsController, 'createOrUpdate'])
              router.delete('/:accountingId', [AccountingsController, 'delete'])
              router.put('/entries/:entryId/status', [AccountingsController, 'updateStatus'])

              // Catégories comptables
              router.get('/categories', [AccountingsController, 'getCategories'])
              router.post('/categories', [AccountingsController, 'createOrUpdateCategory'])
              router.delete('/categories/:categoryId', [AccountingsController, 'deleteCategory'])

              // Statistiques
              router.get('/stats', [AccountingsController, 'getStats'])

              // Routes spécifiques aux contacts
              router.get('/participant', [AccountingsController, 'getContactAccountingsproject'])
            })
            .prefix('/:id/management/accounting')

          // ROUTES MATÉRIELS POUR PROJETS
          router.get('/:id/material-selections', [
            PieceMaterialsController,
            'getProjectMaterialSelections',
          ])
          router.post('/:id/sync-material-selections', [
            PieceMaterialsController,
            'syncWithCallsheets',
          ])
          router.get('/:id/assigned-materials', [
            MaterialsController,
            'getProjectAssignedMaterials',
          ])

          // =============================================================================
          // GESTION DU RECRUTEMENT
          // =============================================================================
          router
            .group(() => {
              // Paramètres de recrutement
              router.get('/settings', [RecruitmentController, 'getSettings'])
              router.put('/settings', [RecruitmentController, 'updateSettings'])

              router.post('/auto-import-all', [RecruitmentController, 'autoImportAllContacts'])

              // Contacts de recrutement - Routes principales
              router.get('/contacts', [RecruitmentController, 'getContacts'])
              router.get('/', [RecruitmentController, 'getContacts'])
              router.post('/contacts/manual', [RecruitmentController, 'createManualContact'])
              router.post('/contacts', [RecruitmentController, 'createManualContact'])
              router.post('/contacts/import', [RecruitmentController, 'importContacts'])
              router.put('/contacts/:contactId/status', [
                RecruitmentController,
                'updateContactStatus',
              ])
              router.put('/contacts/:contactId', [RecruitmentController, 'updateContactStatus']) // Alias
              router.delete('/contacts/:contactId', [RecruitmentController, 'deleteContact'])

              // Recherche de contacts
              router.post('/search-contacts', [RecruitmentController, 'searchContacts'])

              router.post('/send-recommendation-email', [
                RecruitmentController,
                'sendRecommendationEmail',
              ])

              // Envoi d'emails
              router.post('/send-emails', [RecruitmentController, 'sendRecruitmentEmails'])

              // Import depuis projet
              router.get('/import-project', [RecruitmentController, 'getAvailableProjects'])
              router.post('/import-project', [RecruitmentController, 'importFromProject'])

              // Recommandations
              router.get('/recommendations', [RecruitmentController, 'getRecommendations'])
              router.post('/recommendations/:recommendationId/handle', [
                RecruitmentController,
                'handleRecommendation',
              ])

              // Statistiques
              router.get('/stats', [RecruitmentController, 'getStats'])
            })
            .prefix('/:id/management/recruitment')

          // =============================================================================
          // GESTION DES PARTICIPANTS
          // =============================================================================
          router
            .group(() => {
              router.get('/', [ParticipantsController, 'getAll'])
              router.post('/', [ParticipantsController, 'createOrUpdate'])
              router.get('/answers', [ParticipantsController, 'getParticipantsAnswers'])
              router.get('/:participantId', [ParticipantsController, 'getOne'])
              router.delete('/:participantId', [ParticipantsController, 'delete'])

              // Demander une audition pour un participant
              router.post('/:participantId/request-audition', [
                AuditionsController,
                'requestAudition',
              ])
            })
            .prefix('/:id/management/participants')

          // =============================================================================
          // GESTION DES AUDITIONS
          // =============================================================================
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
              router.delete('/section-pdfs/:pdfFileId', [
                AuditionsController,
                'removePdfFromSection',
              ])
              router.get('/debug-files', [AuditionsController, 'debugFiles'])
            })
            .prefix('/:id/management/auditions')

          // =============================================================================
          // GESTION DES VALIDATIONS
          // =============================================================================
          router
            .group(() => {
              router.get('/', [ParticipantsController, 'getApplications'])
              router.post('/', [ParticipantsController, 'validateParticipant'])
            })
            .prefix('/:id/management/validation')

          // =============================================================================
          // GESTION DES INSCRIPTIONS
          // =============================================================================
          router
            .group(() => {
              router.delete('/', [RegistrationsController, 'delete'])
              router.post('/', [RegistrationsController, 'createOrUpdate'])
            })
            .prefix('/:id/management/registration')

          // =============================================================================
          // GESTION DES CALL SHEETS
          // =============================================================================
          router
            .group(() => {
              router.get('/', [CallsheetsController, 'getAll'])
              router.get('/:callsheetId', [CallsheetsController, 'getOne'])
              router.post('/', [CallsheetsController, 'createOrUpdate'])
              router.delete('/:callsheetId', [CallsheetsController, 'delete'])
            })
            .prefix('/:id/management/call_sheets')

          // =============================================================================
          // GESTION DES MAILINGS
          // =============================================================================
          router
            .group(() => {
              router.get('/', [MailingsController, 'getOutgoing'])
            })
            .prefix('/:id/management/mailing')
        })
        .prefix('/projects')

      // =============================================================================
      // GESTION DES COMPOSITEURS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [ComposersController, 'getAll'])
          router.get('/:id/pieces', [ComposersController, 'getPieces'])
          router.put('/', [ComposersController, 'createOrUpdate'])
          router.delete('/:id', [ComposersController, 'delete'])
        })
        .prefix('/composer')

      // =============================================================================
      // GESTION DES PIÈCES (CRUD GÉNÉRAL)
      // =============================================================================
      router
        .group(() => {
          router.get('/', [PiecesController, 'getAll'])
          router.put('/', [PiecesController, 'createOrUpdate'])
          router.delete('/:id', [PiecesController, 'delete'])
        })
        .prefix('/piece')

      // =============================================================================
      // GESTION DES TYPES DE PIÈCES
      // =============================================================================
      router
        .group(() => {
          router.get('/', [TypeOfPiecesController, 'getAll'])
          router.put('/', [TypeOfPiecesController, 'createOrUpdate'])
          router.delete('/:id', [TypeOfPiecesController, 'delete'])
        })
        .prefix('/type_of_pieces')

      // =============================================================================
      // GESTION DES FICHIERS (ANCIEN SYSTÈME - GARDÉ POUR COMPATIBILITÉ)
      // =============================================================================
      router
        .group(() => {
          router.post('/', [FilesController, 'upload'])
          router.get('/', [FilesController, 'getAll'])
          router.put('/:id', [FilesController, 'update'])
          router.delete('/:id', [FilesController, 'delete'])
          router.get('/:id/info', [FilesController, 'info'])
        })
        .prefix('/files')

      // =============================================================================
      // GESTION DES DOSSIERS (ANCIEN SYSTÈME - GARDÉ POUR COMPATIBILITÉ)
      // =============================================================================
      router
        .group(() => {
          router.put('/', [FoldersController, 'create'])
          router.post('/', [FoldersController, 'update'])
          router.get('/', [FoldersController, 'getAll'])
          router.delete('/:id', [FoldersController, 'delete'])
        })
        .prefix('/folders')

      // =============================================================================
      // GESTION DES CONTACTS
      // =============================================================================
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

      // =============================================================================
      // GESTION DES INSTRUMENTS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [InstrumentsController, 'getAll'])
          router.post('/', [InstrumentsController, 'createOrUpdate'])
          router.delete('/:id', [InstrumentsController, 'delete'])
        })
        .prefix('/instrument')

      // =============================================================================
      // GESTION DES UTILISATEURS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [UsersController, 'getAll'])
          router.get('/current', [UsersController, 'getCurrentUser'])
          router.put('/', [UsersController, 'create'])
          router.patch('/:id', [UsersController, 'update'])
          router.delete('/:id', [UsersController, 'delete'])
        })
        .prefix('/users')

      // =============================================================================
      // GESTION DES RECOMMANDATIONS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [RecommendSomeonesController, 'getAll'])
          router.get('/:id', [RecommendSomeonesController, 'getOne'])
          router.delete('/:id', [RecommendSomeonesController, 'delete'])
        })
        .prefix('/recommend_someone')

      // =============================================================================
      // GESTION DES MAILINGS (GLOBAL)
      // =============================================================================
      router
        .group(() => {
          router.post('/sendRefusalEmailToParticipant', [
            MailingsController,
            'sendRefusalEmailToParticipant',
          ])
          router.post('/sendAuditionRequest', [MailingsController, 'sendAuditionRequest'])
          router.post('/sendTemplateToList', [MailingsController, 'sendTemplateToList'])
          router.post('/sendCallsheetNotification', [
            MailingsController,
            'sendCallsheetNotification',
          ])
          router.post('/sendRecommendedNotification', [
            MailingsController,
            'sendRecommendedNotification',
          ])
          router.post('/sendRecruitmentNotification', [
            MailingsController,
            'sendRecruitmentNotification',
          ])
          router.post('/sendParticipationValidationNotification', [
            MailingsController,
            'sendParticipationValidationNotification',
          ])
          router.post('/sendMailToParticipants', [MailingsController, 'sendMailToParticipants'])

          router.post('/sendMailToIndividualContacts', [
            MailingsController,
            'sendMailToIndividualContacts',
          ])

          router
            .group(() => {
              router.get('/default', [DefaultTemplatesController, 'getDefaultTemplates'])
              router.put('/default/edit', [DefaultTemplatesController, 'editDefaultTemplate'])
            })
            .prefix('/templates')
        })
        .prefix('/mailing')

      // =============================================================================
      // GESTION DES LISTES
      // =============================================================================
      router
        .group(() => {
          router.get('/', [ListsController, 'getAll'])
          router.get('/:id', [ListsController, 'getOne'])
          router.put('/', [ListsController, 'createOrUpdate'])
          router.delete('/:id', [ListsController, 'delete'])
        })
        .prefix('/lists')

      // =============================================================================
      // GESTION DES GROUPES DE SECTIONS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [SectionGroupsController, 'getAll'])
          router.get('/:id', [SectionGroupsController, 'getOne'])
          router.post('/', [SectionGroupsController, 'createOrUpdate'])
          router.delete('/:id', [SectionGroupsController, 'delete'])
        })
        .prefix('/sectionGroups')

      // =============================================================================
      // GESTION DES SECTIONS
      // =============================================================================
      router
        .group(() => {
          router.get('/', [SectionsController, 'getAll'])
          router.delete('/:id', [SectionsController, 'delete'])
          router.post('/', [SectionsController, 'createOrUpdate'])
        })
        .prefix('/sections')

      // =============================================================================
      // GESTION DES TEMPLATES
      // =============================================================================
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
