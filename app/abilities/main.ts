import User from '#models/user'
import { Bouncer } from '@adonisjs/bouncer'

// ✅ Seul le superadmin peut gérer les utilisateurs et leurs privilèges
export const adminRights = Bouncer.ability(async (user: User) => {
  return user.role === 'superadmin' && user.isActive
})

// ✅ Accès aux contacts (superadmin ou user avec permission)
export const canAccessContacts = Bouncer.ability(async (user: User) => {
  if (!user.isActive) return false
  if (user.role === 'superadmin') return user.canAccessContacts
  if (user.role === 'user') return user.canAccessContacts
  return false // guest : jamais accès aux contacts
})

// ✅ Accès à l'export des contacts
export const canExportContacts = Bouncer.ability(async (user: User) => {
  if (!user.isActive) return false
  if (user.role === 'superadmin') return user.canExportContacts
  if (user.role === 'user') return user.canExportContacts
  return false // guest : jamais
})

// ✅ Accès à un projet spécifique
export const canAccessProject = Bouncer.ability(async (user: User, projectId: number) => {
  if (!user.isActive) return false
  if (user.role === 'superadmin' || user.role === 'user') return true
  // guest : vérifier la liste des projets autorisés
  await user.load('accessibleProjects')
  return user.accessibleProjects.some((p) => p.id === projectId)
})
