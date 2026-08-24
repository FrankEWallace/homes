import { prisma } from '../config/prisma';

interface AuditParams {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}

export function logAdminAction(params: AuditParams): Promise<void> {
  return prisma.adminAuditLog
    .create({
      data: {
        adminId:    params.adminId,
        action:     params.action,
        targetType: params.targetType,
        targetId:   params.targetId,
        meta:       params.meta as any,
      },
    })
    .then(() => undefined);
}
