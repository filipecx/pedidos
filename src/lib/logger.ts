import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'password',
      'password_hash',
      'secret',
      'token',
      'authorization',
      'cookie',
      '*.password',
      '*.secret',
      '*.token',
    ],
    remove: true,
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:HH:MM:ss.l',
          },
        },
      }
    : {}),
});

/**
 * Cria um child logger para isolar o contexto de um módulo específico
 * Ex: const log = createChildLogger('payments');
 */
export function createChildLogger(moduleName: string, extraBindings?: Record<string, unknown>) {
  return logger.child({
    module: moduleName,
    ...extraBindings,
  });
}
