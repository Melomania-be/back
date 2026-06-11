// app/validators/user.ts - Version sécurisée (V-04)
import vine from '@vinejs/vine'

/**
 * 🔒 Règle personnalisée pour la politique stricte de mot de passe.
 * Permet de renvoyer un message d'erreur explicite en cas de refus.
 */
const strongPasswordRule = vine.createRule((value: unknown, options, field) => {
  if (typeof value !== 'string') {
    return
  }

  // Regex : min 8 chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^\w\s]).{8,}$/

  if (!passwordRegex.test(value)) {
    // C'est ce message exact qui sera renvoyé au front-end si le mdp est refusé
    field.report(
      'Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.',
      'strong_password',
      field
    )
  }
})

/**
 * Validates the user's login action
 * 💡 Pas de règle stricte ici : les anciens mots de passe faibles peuvent se connecter.
 */
export const userLoginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)

/**
 * Validates the user's creation action
 * 🛡️ Règle stricte appliquée ici
 */
export const userCreationValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    // On applique la règle, et on s'attend toujours à un champ password_confirmation
    password: vine.string().use(strongPasswordRule()).confirmed(),
    fullName: vine.string().optional(),
  })
)

/**
 * Validates the user's update action
 * 🛡️ Règle stricte appliquée uniquement si l'utilisateur décide de modifier son mot de passe
 */
export const userUpdateValidator = vine.compile(
  vine.object({
    email: vine.string().email().optional(),
    fullName: vine.string().optional(),
    // Optionnel : l'admin ou l'utilisateur peut modifier sans toucher au mot de passe.
    // S'il le change, le nouveau DOIT être fort.
    password: vine.string().use(strongPasswordRule()).confirmed().optional(),
  })
)
