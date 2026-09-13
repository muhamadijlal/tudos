import { projectCollection } from "#resources/project.resource.js";
import { taskCollection } from "#resources/task.resource.js";

const userResource = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  fullName: user.fullName ?? null,
  nik: user.nik ?? null,
  department: user.department ?? null,
  supervisorName: user.supervisorName ?? null,
  supervisorNik: user.supervisorNik ?? null,
  supervisorTitle: user.supervisorTitle ?? null,
  // URL relatif (bukan path disk) — endpoint publik (gak butuh Authorization
  // header), lihat routes/profile-picture.routes.js, biar bisa dipakai
  // langsung sebagai <img src>. Query `v` (dari updatedAt) sengaja ditempel
  // biar URL-nya BERUBAH tiap kali foto diganti/dihapus — path-nya sendiri
  // stabil (/profile-pictures/{id}), jadi tanpa cache-buster ini browser bisa
  // tetep nampilin foto lama yang ke-cache walau di database udah ganti.
  profilePictureUrl: user.profilePicture
    ? `/profile-pictures/${user.id}?v=${new Date(user.updatedAt).getTime()}`
    : null,
  role: user.role ? { id: user.role.id, name: user.role.name } : undefined,
  permissions: user.role?.permissions
    ? user.role.permissions.map((rp) => rp.permission.key)
    : undefined,
  ownedProjects: user.ownedProjects
    ? projectCollection(user.ownedProjects)
    : [],
  assignedTasks: user.taskAssignments
    ? taskCollection(user.taskAssignments.map((a) => a.task))
    : [],
});

const userCollection = (users) => users.map(userResource);

export { userCollection, userResource };
