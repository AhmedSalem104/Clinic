const ROLES = Object.freeze({
  OWNER: 'owner',
  DOCTOR: 'doctor',
  RECEPTION: 'reception',
  PATIENT: 'patient'
});

const PERMISSIONS = Object.freeze({
  VIEW_ALL_PATIENTS: 'patients:view_all',
  VIEW_ASSIGNED_PATIENTS: 'patients:view_assigned',
  MANAGE_PATIENTS: 'patients:manage',
  VIEW_ALL_APPOINTMENTS: 'appointments:view_all',
  VIEW_ASSIGNED_APPOINTMENTS: 'appointments:view_assigned',
  MANAGE_BOOKINGS: 'appointments:manage',
  BOOK_SELF_APPOINTMENT: 'appointments:book_self',
  MANAGE_QUEUE: 'queue:manage',
  VIEW_MEDICAL: 'medical:view',
  WRITE_MEDICAL: 'medical:write',
  MANAGE_CLINIC: 'clinic:manage',
  VIEW_REPORTS: 'reports:view',
  MANAGE_USERS: 'users:manage',
  VIEW_AUDIT: 'audit:view',
  MANAGE_SETTINGS: 'settings:manage'
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_ASSIGNED_PATIENTS,
    PERMISSIONS.VIEW_ASSIGNED_APPOINTMENTS,
    PERMISSIONS.VIEW_MEDICAL,
    PERMISSIONS.WRITE_MEDICAL,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.RECEPTION]: [
    PERMISSIONS.VIEW_ALL_PATIENTS,
    PERMISSIONS.MANAGE_PATIENTS,
    PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.MANAGE_QUEUE
  ],
  [ROLES.PATIENT]: [PERMISSIONS.BOOK_SELF_APPOINTMENT]
});

const hasPermission = (role, permission) => (ROLE_PERMISSIONS[role] || []).includes(permission);

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, hasPermission };
