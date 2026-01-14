/**
 * src/lib/logger.ts
 * Structured logging utility using Pino.
 * Provides consistent logging across the application with correlation IDs for tracing.
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

// Configure Pino logger
const logger = pino(
    {
        level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
        // Pretty print in development for better readability
        ...(isDev && {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            },
        }),
    },
);

/**
 * Create a child logger with a correlation ID for request tracking.
 * This helps trace a single request through multiple services/functions.
 */
export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}

/**
 * Log error with proper error handling
 */
export function logError(
    context: string,
    error: unknown,
    requestId?: string,
) {
    const log = requestId ? logger.child({ requestId }) : logger;

    if (error instanceof Error) {
        log.error(
            {
                context,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                },
            },
            'Error occurred',
        );
    } else {
        log.error({ context, error }, 'Unknown error occurred');
    }
}

/**
 * Log API request details
 */
export function logRequest(
    requestId: string,
    method: string,
    pathname: string,
    metadata?: Record<string, unknown>,
) {
    logger.info(
        {
            requestId,
            method,
            pathname,
            ...metadata,
        },
        'API request',
    );
}

/**
 * Log API response
 */
export function logResponse(
    requestId: string,
    method: string,
    pathname: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>,
) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level](
        {
            requestId,
            method,
            pathname,
            statusCode,
            duration,
            ...metadata,
        },
        'API response',
    );
}

export default logger;
