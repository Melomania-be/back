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

  // Authentication
  router.post('/sign_in', [UsersController, 'signIn'])

  // ✅ ROUTES FICHIERS PUBLIQUES ÉTENDUES
  router.get('/files/download/:id', [FilesController, 'download'])
  router.get('/files/stream/:id', [FilesController, 'stream'])     // ← NOUVELLE ROUTE STREAMING
  router.get('/files/info/:id', [FilesController, 'info'])         // ← NOUVELLE ROUTE INFO (debug)

  // Recommend someone (public)
  router.post('/recommend_someone', [RecommendSomeonesController, 'create'])

  // Registration routes (public)
  router.get('/registration/:id', [RegistrationsController, 'getOne'])
  router.put('/registration/submit', [RegistrationsController, 'submit'])

  // Forms routes (public - pour récupérer les formulaires d'inscription)
  router.get('/registration/:id/forms', [FormsController, 'getFromProject'])

  // Call sheets (public access)
  router.get('/call_sheets/:id/:visitorId', [CallsheetsController, 'getOne'])

  // Contact unsubscribe (public)
  router.put('/unsubscribe', [ContactsController, 'unsubscribe_from_mails'])

  // =============================================================================
  // ROUTES PUBLIQUES POUR AUDITIONS (CANDIDATS) - CORRIGÉ
  // =============================================================================
  router.group(() => {
    // Page d'audition sécurisée pour les candidats
    router.get('/:token', [AuditionsController, 'getAuditionPage'])

    // Upload de fichier d'audition
    router.post('/:token/upload', [AuditionsController, 'uploadAuditionFile'])

    // Sauvegarder les notes temporaires
    router.post('/:token/save-notes', [AuditionsController, 'saveTemporaryNotes'])

    // Soumettre l'audition complète
    router.post('/:token/submit', [AuditionsController, 'submitAudition'])

    // Supprimer un fichier d'audition
    router.delete('/:token/files/:fileId', [AuditionsController, 'deleteAuditionFile'])

    // Gestion des PDFs d'audition (côté participant)
    router.get('/:token/pdfs', [AuditionsController, 'getAuditionPdfs'])
    router.get('/:token/pdf/:pdfFileId/download', [AuditionsController, 'downloadAuditionPdf'])
  }).prefix('/audition')

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
          // GESTION DES PARTICIPANTS
          // =============================================================================
          router
            .group(() => {
              router.get('/', [ParticipantsController, 'getAll'])
              router.post('/', [ParticipantsController, 'createOrUpdate'])
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
              // Voir toutes les auditions d'un projet
              router.get('/', [AuditionsController, 'getProjectAuditions'])

              // Supprimer une audition
              router.delete('/:auditionId', [AuditionsController, 'deleteAudition'])

              // Upload de PDF pour audition
              router.post('/upload-pdf', [AuditionsController, 'uploadPdfForAudition'])

              // Upload de PDF pour une section spécifique
              router.post('/upload-pdf-section', [AuditionsController, 'uploadPdfForSection'])

              // Obtenir tous les PDFs groupés par section
              router.get('/pdfs', [AuditionsController, 'getProjectPdfs'])

              // ✅ NOUVELLE ROUTE : Statistiques PDF par section
              router.get('/section-pdfs', [AuditionsController, 'getProjectPdfs'])

              // Envoyer des PDFs en masse à une section
              router.post('/bulk-send-pdfs', [AuditionsController, 'bulkSendPdfsToSection'])

              // Supprimer un PDF d'audition
              router.delete('/pdf/:pdfFileId', [AuditionsController, 'deleteAuditionPdf'])

              // Supprimer un PDF d'une section (toutes ses associations)
              router.delete('/section-pdfs/:pdfFileId', [
                AuditionsController,
                'removePdfFromSection',
              ])

              // ✅ ROUTE DE DEBUG (à supprimer en production)
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
      // GESTION DES PIÈCES
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
      // GESTION DES FICHIERS (PROTÉGÉE)
      // =============================================================================
      router
        .group(() => {
          router.post('/', [FilesController, 'upload'])
          router.get('/', [FilesController, 'getAll'])
          router.put('/:id', [FilesController, 'update'])
          router.delete('/:id', [FilesController, 'delete'])

          // ✅ ROUTES ADDITIONNELLES POUR ADMIN
          router.get('/:id/info', [FilesController, 'info'])     // Info détaillée sur un fichier
        })
        .prefix('/files')

      // =============================================================================
      // GESTION DES DOSSIERS
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
          router.put('/', [UsersController, 'create'])
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
          // Mailing pour participants spécifiques
          router.post('/sendRefusalEmailToParticipant', [
            MailingsController,
            'sendRefusalEmailToParticipant',
          ])

          // Mailing pour des listes de contacts
          router.post('/sendTemplateToList', [MailingsController, 'sendTemplateToList'])

          // Notifications automatiques
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

          // Templates par défaut
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
