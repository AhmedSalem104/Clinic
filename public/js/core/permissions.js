export const roles = { owner: 'owner', doctor: 'doctor', reception: 'reception', patient: 'patient' };
export const can = (user, permission) => {
  const map = {
    owner: ['*'],
    doctor: ['medical:view', 'medical:write', 'patients:view_assigned', 'appointments:view_assigned', 'reports:view'],
    reception: ['patients:view_all', 'patients:manage', 'appointments:view_all', 'appointments:view_assigned', 'appointments:manage', 'queue:manage'],
    patient: []
  };
  return Boolean(user && (map[user.role] || []).some((item) => item === '*' || item === permission));
};
export const isMedicalRole = (user) => user?.role === roles.owner || user?.role === roles.doctor;
