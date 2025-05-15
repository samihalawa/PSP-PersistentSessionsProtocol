import winston from 'winston';

/**
 * Creates a logger with the specified module name
 */
export function createLogger(module: string) {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(info => {
        const { timestamp, level, message, ...rest } = info;
        const ts = timestamp as string;
        const formattedTimestamp = ts.replace('T', ' ').replace('Z', '');
        const meta = Object.keys(rest).length 
          ? ` ${JSON.stringify(rest)}` 
          : '';
        
        return `${formattedTimestamp} [${level}] [${module}]: ${message}${meta}`;
      })
    ),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => {
            const { timestamp, level, message, ...rest } = info;
            const ts = timestamp as string;
            const formattedTimestamp = ts.split('T')[1].split('.')[0];
            const meta = Object.keys(rest).length 
              ? ` ${JSON.stringify(rest)}` 
              : '';
            
            return `${formattedTimestamp} [${level}] [${module}]: ${message}${meta}`;
          })
        )
      }),
      
      // File transport for errors
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        dirname: process.env.LOG_DIR || 'logs'
      }),
      
      // File transport for all logs
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        dirname: process.env.LOG_DIR || 'logs'
      })
    ]
  });
  
  return logger;
}