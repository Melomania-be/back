// import type { HttpContext } from '@adonisjs/core/http'

import Project from '#models/project'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { simpleFilter, Filter } from '#services/simple_filter'
import Participant from '#models/participant'
import db from '@adonisjs/lucid/services/db'
import SectionGroup from '#models/section_group'
import Piece from '#models/piece'
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

    return await simpleFilter(ctx, Project, baseQuery, new Filter(Project, ['name']), [], {
      filtered: true,
      paginated: true,
      ordered: true,
    })
  }

  async getOne({ params }: HttpContext) {
    const data = await Project.query()
      .where('id', params.id)
      .preload('concerts')
      .preload('pieces', (query) => {
        query.preload('composer').preload('folder', (subQuery) => {
          subQuery.preload('files')
        })
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

  async getDashboard({ params }: HttpContext) {
    const data = await Project.query()
      .where('id', params.id)
      .preload('concerts', (query) => {
        query.limit(3).orderBy('date', 'desc')
      })
      .preload('participants')
      .preload('callsheets', (query) => {
        query.limit(3).orderBy('updated_at', 'desc')
      })
      .preload('registration')
      .preload('rehearsals')
      .preload('concerts')
      .preload('responsibles')
      .preload('pieces', (query) => {
        query.preload('composer').preload('folder', (subQuery) => {
          subQuery.preload('files')
        })
      })
      .preload('sectionGroup', (query) => {
        query.preload('sections')
      })
      .preload('folder', (query) => {
        query.preload('files')
      })

    const participantsNotValidated = await Participant.query()
      .preload('contact')
      .where('project_id', params.id)
      .andWhere('accepted', false)

    const participantsWithoutEmail = await Participant.query()
      .preload('contact')
      .where('project_id', params.id)
      .andWhere('accepted', true)
      .andWhereHas('contact', (subQuery) => {
        subQuery.whereNull('email').orWhere('email', '')
      })

    const participantsNotSeenCallsheet = await Participant.query()
      .preload('contact')
      .where('participants.project_id', params.id)
      .andWhere('accepted', true)
      .andWhere((subQuery) => {
        subQuery
          .where(
            'last_activity',
            '<',
            db
              .from('callsheets')
              .select('updated_at')
              .where('project_id', params.id)
              .andWhereNotNull('updated_at')
              .orderBy('updated_at', 'desc')
              .limit(1)
          )
          .orDoesntHave('hasSeenCallsheets')
      })

    return {
      data,
      participantsNotValidated,
      participantsWithoutEmail,
      participantsNotSeenCallsheet,
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

    const pieces = await Piece.query().whereIn('id', data.pieces_ids)

    await project.related('pieces').detach()
    await project.related('pieces').sync(pieces.map((p) => p.id))

    const concerts = await project.related('concerts').query()

    for (const concert of concerts) {
      if (data.concerts.filter((c) => c.id === concert.id).length === 0) {
        await concert.delete()
      } else {
        const dataConcert = data.concerts.find((c) => c.id === concert.id)
        if (dataConcert) {
          concert.merge({
            comment: dataConcert.comment,
            date: DateTime.fromJSDate(dataConcert.date),
            place: dataConcert.place,
          })
          await concert.save()
        }
      }
    }

    for (const concert of data.concerts.filter((c) => c.id === undefined)) {
      await project.related('concerts').create({
        comment: concert.comment,
        date: DateTime.fromJSDate(concert.date),
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
            date: DateTime.fromJSDate(dataRehearsal.date),
            place: dataRehearsal.place,
          })
          await rehearsal.save()
        }
      }
    }

    for (const rehearsal of data.rehearsals.filter((r) => r.id === undefined)) {
      await project.related('rehearsals').create({
        comment: rehearsal.comment,
        date: DateTime.fromJSDate(rehearsal.date),
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
    return await Project.query()
      .where('id', ctx.params.id)
      .preload('rehearsals', (query) => {
        query.preload('participants')
      })
      .preload('concerts', (query) => {
        query.preload('participants')
      })
      .preload('participants', (query) => {
        query.where('accepted', true).preload('contact')
      })
      .firstOrFail()
  }
}
