import type { Response } from 'express';

export interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Meta,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
};

export const sendCreated = <T>(res: Response, data: T, message = 'Created') =>
  sendSuccess(res, data, message, 201);

export const paginate = (page: number, limit: number, total: number): Meta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
