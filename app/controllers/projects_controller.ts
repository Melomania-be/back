import Project from '#models/project'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { simpleFilter } from 'adonisjs-filters'
import Participant from '#models/participant'
import db from '@adonisjs/lucid/services/db'
import SectionGroup from '#models/section_group'
import { DateTime } from 'luxon'
import Contact from '#models/contact'
import Folder from '#models/folder'

export default class ProjectsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Project.query()
      .preload('concerts')
      .preload('pieces')
      .preload('participants')
      .preload('registration')
      .preload('rehearsals')
      .preload('sectionGroup')
      .preload('callsheets')

    return await simpleFilter(ctx, baseQuery, ['name'], [], {
      filtered: true,
      paginated: true,
      ordered: true,
    })
  }

  // ✅ CORRECTION : Méthode getOne avec chargement des fichiers
  async getOne({ params }: HttpContext) {
    const data = await Project.query()
      .where('id', params.id)
      .preload('concerts')
      .preload('pieces', (query) => {
        query
          .preload('composer')
          .preload('folder', (subQuery) => {
            subQuery.preload('files')
          })
          .preload('files') // ✅ AJOUT : Charger les fichiers directement liés à la pièce
          .pivotColumns(['order'])
          .orderBy('order', 'asc')
      })
      .preload('participants')
      .preload('registration')
      .preload('rehearsals')
      .preload('sectionGroup', (query) => {
        query.preload('sections', (subQuery) => {
          subQuery.preload('instruments')
        })
      })
      .preload('callsheets')
      .preload('responsibles')
      .preload('folder', (query) => {
        query.preload('files')
      })
      .firstOrFail()
    return data
  }

  // ✅ CORRECTION : Méthode getDashboard avec chargement des fichiers
  async getDashboard({ params }: HttpContext) {
    try {
      const projectId = params.id;

      console.log('📊 DASHBOARD - Request for project:', projectId);
      console.log('📊 DASHBOARD - Project ID type:', typeof projectId);

      if (!projectId) {
        console.error('❌ DASHBOARD - No project ID provided');
        throw new Error('Project ID is required');
      }

      console.log('📊 DASHBOARD - Loading project data...');
      const data = await Project.query()
        .where('id', projectId)
        .preload('concerts', (query) => {
          query.limit(3).orderBy('start_date', 'desc')
        })
        .preload('participants', (query) => {
          query.preload('contact').preload('section')
        })
        .preload('callsheets', (query) => {
          query.limit(3).orderBy('updated_at', 'desc')
        })
        .preload('registration', (query) => {
          query.preload('content').preload('form')
        })
        .preload('rehearsals', (query) => {
          query.orderBy('start_date', 'asc')
        })
        .preload('responsibles')
        .preload('pieces', (query) => {
          query
            .preload('composer')
            .preload('typeOfPiece')
            .preload('folder', (subQuery) => {
              subQuery.preload('files')
            })
            .preload('files') // ✅ AJOUT : Charger les fichiers directement liés aux pièces
            .pivotColumns(['order'])
            .orderBy('order', 'asc')
        })
        .preload('sectionGroup', (query) => {
          query.preload('sections', (subQuery) => {
            subQuery.preload('instruments').pivotColumns(['order']).orderBy('order', 'asc')
          })
        })
        .preload('folder', (query) => {
          query.preload('files')
        })
        .firstOrFail()

      console.log('📊 DASHBOARD - Project loaded:', {
        id: data.id,
        name: data.name,
        participantsCount: data.participants?.length || 0,
        piecesCount: data.pieces?.length || 0,
        concertsCount: data.concerts?.length || 0,
        rehearsalsCount: data.rehearsals?.length || 0
      });

      console.log('📊 DASHBOARD - Loading participants not validated...');
      const participantsNotValidated = await Participant.query()
        .preload('contact')
        .preload('section')
        .where('project_id', projectId)
        .andWhere('accepted', false)
        .orderBy('created_at', 'desc')

      console.log('📊 DASHBOARD - Participants not validated:', participantsNotValidated.length);

      console.log('📊 DASHBOARD - Loading participants without email...');
      const participantsWithoutEmail = await Participant.query()
        .preload('contact')
        .preload('section')
        .where('project_id', projectId)
        .andWhere('accepted', true)
        .andWhereHas('contact', (subQuery) => {
          subQuery.whereNull('email').orWhere('email', '').orWhere('email', 'NOT LIKE', '%@%')
        })
        .orderBy('created_at', 'desc')

      console.log('📊 DASHBOARD - Participants without email:', participantsWithoutEmail.length);

      console.log('📊 DASHBOARD - Loading participants not seen callsheet...');
      const participantsNotSeenCallsheet = await Participant.query()
        .preload('contact')
        .preload('section')
        .where('participants.project_id', projectId)
        .andWhere('accepted', true)
        .andWhere((subQuery) => {
          subQuery
            .whereNull('last_activity')
            .orWhere(
              'last_activity',
              '<',
              db
                .from('callsheets')
                .select('updated_at')
                .where('project_id', projectId)
                .andWhereNotNull('updated_at')
                .orderBy('updated_at', 'desc')
                .limit(1)
            )
        })
        .orderBy('last_activity', 'asc')

      console.log('📊 DASHBOARD - Participants not seen callsheet:', participantsNotSeenCallsheet.length);

      const stats = {
        totalParticipants: data.participants?.length || 0,
        acceptedParticipants: data.participants?.filter(p => p.accepted).length || 0,
        pendingParticipants: participantsNotValidated.length,
        participantsWithoutEmail: participantsWithoutEmail.length,
        participantsNotSeenCallsheet: participantsNotSeenCallsheet.length,
        totalPieces: data.pieces?.length || 0,
        totalConcerts: data.concerts?.length || 0,
        totalRehearsals: data.rehearsals?.length || 0,
        totalCallsheets: data.callsheets?.length || 0,
        upcomingConcerts: data.concerts?.filter(c =>
          new Date(c.start_date.toString()) > new Date()
        ).length || 0,
        upcomingRehearsals: data.rehearsals?.filter(r =>
          new Date(r.start_date.toString()) > new Date()
        ).length || 0
      }

      console.log('📊 DASHBOARD - Statistics calculated:', stats);

      const projectData = {
        id: data.id,
        name: data.name,
        sectionGroupId: data.section_group_id,
        folderId: data.folder_id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,

        concerts: data.concerts || [],
        rehearsals: data.rehearsals || [],
        pieces: data.pieces || [],
        participants: data.participants || [],
        callsheets: data.callsheets || [],
        responsibles: data.responsibles || [],
        sectionGroup: data.sectionGroup || null,
        registration: data.registration || null,
        folder: data.folder || null,

        stats
      };

      console.log('📊 DASHBOARD - Project data prepared:', {
        id: projectData.id,
        name: projectData.name,
        hasParticipants: projectData.participants.length > 0,
        hasPieces: projectData.pieces.length > 0,
        hasConcerts: projectData.concerts.length > 0
      });

      const result = {
        data: projectData,
        participantsNotValidated: participantsNotValidated || [],
        participantsWithoutEmail: participantsWithoutEmail || [],
        participantsNotSeenCallsheet: participantsNotSeenCallsheet || []
      }

      console.log('📊 DASHBOARD - Final result prepared:', {
        hasData: !!result.data,
        dataId: result.data.id,
        dataName: result.data.name,
        participantsNotValidatedCount: result.participantsNotValidated.length,
        participantsWithoutEmailCount: result.participantsWithoutEmail.length,
        participantsNotSeenCallsheetCount: result.participantsNotSeenCallsheet.length
      });

      console.log('📊 DASHBOARD - Returning result to client');
      return result;

    } catch (error) {
      console.error('❌ DASHBOARD - Error occurred:', error);
      console.error('❌ DASHBOARD - Error message:', error.message);
      console.error('❌ DASHBOARD - Error stack:', error.stack);
      console.error('❌ DASHBOARD - Project ID:', params.id);

      throw error;
    }
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createProjectValidator)

    let project: Project

    if (!data.id) {
      project = await Project.create({ name: data.name })
    } else {
      project = await Project.updateOrCreate({ id: data.id }, { name: data.name })
    }

    const sectionGroup = await SectionGroup.find(data.section_group_id)

    if (sectionGroup === null) {
      return ctx.response.status(400).send({ message: 'Section group not found' })
    }

    await project.related('sectionGroup').dissociate()
    await project.related('sectionGroup').associate(sectionGroup)

    const responsibles = await Contact.findMany(data.responsibles_ids)

    await project.related('responsibles').detach()
    await project.related('responsibles').attach(responsibles.map((r) => r.id))

    const pieces = data.pieces

    const pivotData = pieces.reduce(
      (acc: Record<number, { order: number }>, piece) => {
        acc[piece.id] = { order: piece.pivot_order }
        return acc
      },
      {} as Record<number, { order: number }>
    )

    await project.related('pieces').detach()
    await project.related('pieces').sync(pivotData)

    const concerts = await project.related('concerts').query()

    for (const concert of concerts) {
      if (data.concerts.filter((c) => c.id === concert.id).length === 0) {
        await concert.delete()
      } else {
        const dataConcert = data.concerts.find((c) => c.id === concert.id)
        if (dataConcert) {
          concert.merge({
            comment: dataConcert.comment,
            start_date: DateTime.fromJSDate(dataConcert.start_date),
            end_date: dataConcert.end_date ? DateTime.fromJSDate(dataConcert.end_date) : null,
            place: dataConcert.place,
          })
          await concert.save()
        }
      }
    }

    for (const concert of data.concerts.filter((c) => c.id === undefined)) {
      await project.related('concerts').create({
        comment: concert.comment,
        start_date: DateTime.fromJSDate(concert.start_date),
        end_date: concert.end_date ? DateTime.fromJSDate(concert.end_date) : null,
        place: concert.place,
      })
    }

    const rehearsals = await project.related('rehearsals').query()

    for (const rehearsal of rehearsals) {
      if (data.rehearsals.filter((r) => r.id === rehearsal.id).length === 0) {
        await rehearsal.delete()
      } else {
        const dataRehearsal = data.rehearsals.find((r) => r.id === rehearsal.id)
        if (dataRehearsal) {
          rehearsal.merge({
            comment: dataRehearsal.comment,
            start_date: DateTime.fromJSDate(dataRehearsal.start_date),
            end_date: dataRehearsal.end_date ? DateTime.fromJSDate(dataRehearsal.end_date) : null,
            place: dataRehearsal.place,
          })
          await rehearsal.save()
        }
      }
    }

    for (const rehearsal of data.rehearsals.filter((r) => r.id === undefined)) {
      await project.related('rehearsals').create({
        comment: rehearsal.comment,
        start_date: DateTime.fromJSDate(rehearsal.start_date),
        end_date: rehearsal.end_date ? DateTime.fromJSDate(rehearsal.end_date) : null,
        place: rehearsal.place,
      })
    }

    if (data.folder_id) {
      const folder = await Folder.find(data.folder_id)
      if (folder) {
        await project.related('folder').associate(folder)
      } else {
        await project.related('folder').dissociate()
      }
    } else {
      await project.related('folder').dissociate()
    }

    return await project.save()
  }

  async delete({ params }: HttpContext) {
    const project = await Project.find(params.id)

    if (project === null) {
      return { message: 'Project not found' }
    }

    await project.delete()

    return { message: 'Project deleted' }
  }

  async getAttendance(ctx: HttpContext) {
    const project = await Project.query()
      .where('id', ctx.params.id)
      .preload('rehearsals', (query) => {
        query.preload('participants', (participantQuery) => {
          participantQuery.pivotColumns(['comment'])
        })
      })
      .preload('concerts', (query) => {
        query.preload('participants', (participantQuery) => {
          participantQuery.pivotColumns(['comment'])
        })
      })
      .preload('participants', (query) => {
        query.where('accepted', true).preload('contact').preload('section')
      })
      .preload('sectionGroup', (query) => {
        query.preload('sections', (subQuery) => {
          subQuery.pivotColumns(['order']).orderBy('order', 'asc')
        })
      })
      .firstOrFail()

    const sortedParticipants = project.participants.sort((a, b) => {
      const sectionA = a.section?.name || ''
      const sectionB = b.section?.name || ''
      const sectionGroup = project.sectionGroup

      const sectionOrderA =
        sectionGroup?.sections.find((section) => section.name === sectionA)?.$extras.pivot_order ||
        0
      const sectionOrderB =
        sectionGroup?.sections.find((section) => section.name === sectionB)?.$extras.pivot_order ||
        0

      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB
      }

      if (a.is_section_leader !== b.is_section_leader) {
        return a.is_section_leader ? -1 : 1
      }

      const nameA = `${a.contact?.first_name || ''} ${a.contact?.last_name || ''}`.toLowerCase()
      const nameB = `${b.contact?.first_name || ''} ${b.contact?.last_name || ''}`.toLowerCase()

      return nameA.localeCompare(nameB)
    })

    return {
      ...project.serialize(),
      participants: sortedParticipants,
    }
  }
}
