import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from './saved-searches.schemas';

export async function createSavedSearch(userId: string, input: CreateSavedSearchInput) {
  return prisma.savedSearch.create({
    data: {
      userId,
      name: input.name,
      query: input.query as Prisma.InputJsonValue,
      notify: input.notify,
      frequency: input.frequency,
    },
  });
}

export async function listSavedSearches(userId: string) {
  return prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateSavedSearch(
  id: string,
  userId: string,
  input: UpdateSavedSearchInput,
) {
  const existing = await prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) throw new AppError(404, 'Saved search not found');
  if (existing.userId !== userId) throw new AppError(403, 'Access denied');

  return prisma.savedSearch.update({ where: { id }, data: input });
}

export async function deleteSavedSearch(id: string, userId: string) {
  const existing = await prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) throw new AppError(404, 'Saved search not found');
  if (existing.userId !== userId) throw new AppError(403, 'Access denied');

  await prisma.savedSearch.delete({ where: { id } });
  return { deleted: true };
}
