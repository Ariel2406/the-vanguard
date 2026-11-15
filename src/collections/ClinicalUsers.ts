import type { Access, CollectionConfig } from 'payload'

const isClinicalUser = (
  user: unknown,
): user is { collection: 'clinical-users'; id: string | number; role?: string } =>
  Boolean(
    user &&
    typeof user === 'object' &&
    'collection' in user &&
    user.collection === 'clinical-users',
  )

const canReadClinicalUsers: Access = ({ req }) => {
  if (!isClinicalUser(req.user)) return false
  if (req.user.role === 'cmo') return true
  return { id: { equals: req.user.id } }
}

const canUpdateClinicalUsers: Access = ({ req }) => {
  if (!isClinicalUser(req.user)) return false
  if (req.user.role === 'cmo') return true
  return { id: { equals: req.user.id } }
}

export const ClinicalUsers: CollectionConfig = {
  slug: 'clinical-users',
  admin: {
    hidden: true,
    useAsTitle: 'displayName',
  },
  auth: true,
  access: {
    admin: () => false,
    create: () => false,
    delete: ({ req }) => isClinicalUser(req.user) && req.user.role === 'cmo',
    read: canReadClinicalUsers,
    update: canUpdateClinicalUsers,
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
    },
    {
      name: 'crewId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Astronauta', value: 'astronaut' },
        { label: 'Oficial Médico de Tripulación', value: 'cmo' },
        { label: 'Comandante de Misión', value: 'commander' },
      ],
    },
  ],
  versions: false,
}
