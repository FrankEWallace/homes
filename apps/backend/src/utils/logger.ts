import { env } from '../config/env';

/**
 * Minimal structured logger (Phase 5 observability). Emits single-line JSON in
 * production so log aggregators can parse fields; falls back to a readable
 * format in dev. Dependency-free on purpose — swap for pino/winston later
 * behind this same interface without touching call sites.
 */
type Fields = Record<string, unknown>;
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, fields?: Fields) {
  if (env.NODE_ENV === 'test') return;
  const time = new Date().toISOString();
  if (env.NODE_ENV === 'production') {
    process.stdout.write(`${JSON.stringify({ level, time, msg, ...fields })}\n`);
    return;
  }
  const suffix = fields && Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : '';
  const line = `${time} ${level.toUpperCase()} ${msg}${suffix}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit('debug', msg, fields),
  info: (msg: string, fields?: Fields) => emit('info', msg, fields),
  warn: (msg: string, fields?: Fields) => emit('warn', msg, fields),
  error: (msg: string, fields?: Fields) => emit('error', msg, fields),
};
