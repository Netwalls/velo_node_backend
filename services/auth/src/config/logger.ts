import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${ts} [auth] ${level}: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), logFormat),
  transports: [new winston.transports.Console({ format: combine(colorize(), timestamp(), logFormat) })],
});

// morgan-compatible stream
export const morganStream = {
  write: (msg: string) => {
    logger.info(msg.trim());
  },
};

export default logger;
