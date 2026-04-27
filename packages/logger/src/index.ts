import pino from 'pino';

export interface LoggerConfig {
  name: string;
  level?: string;
  prettyPrint?: boolean;
}

const defaultConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: pino.Bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      service: (process.env.SERVICE_NAME as string) || 'unknown',
    }),
  },
  base: undefined,
};

// Use pretty print in development
if (process.env.NODE_ENV === 'development') {
  defaultConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

const rootLogger = pino(defaultConfig);

export function createLogger(name: string): pino.Logger {
  return rootLogger.child({ service: name });
}

export const logger = rootLogger;
export default logger;
