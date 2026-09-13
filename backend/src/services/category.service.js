import prisma from "#prisma/client.js";
import ApiError from "#utils/ApiError.js";

export function findAll() {
  return prisma.category.findMany({ where: { deletedAt: null } });
}

export async function findById(categoryId) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category;
}

export async function create(data) {
  const existing = await prisma.category.findFirst({
    where: { name: data.name, deletedAt: null },
  });

  if (existing) throw new ApiError(409, "Kategori sudah ada");

  return prisma.category.create({ data });
}

export async function update(categoryId, data) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!category) throw new ApiError(404, "Category not found");

  const existing = await prisma.category.findFirst({
    where: { name: data.name, deletedAt: null, NOT: { id: categoryId } },
  });

  if (existing) throw new ApiError(409, "Kategori sudah ada");

  return prisma.category.update({ where: { id: categoryId }, data });
}

export async function remove(categoryId) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
  });

  if (!category) throw new ApiError(404, "Category not found");

  const taskCount = await prisma.task.count({
    where: { categoryId },
  });

  if (taskCount > 0) {
    throw new ApiError(
      409,
      `Kategori tidak bisa dihapus karena masih dipakai ${taskCount} task`,
    );
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { deletedAt: new Date() },
  });
}
