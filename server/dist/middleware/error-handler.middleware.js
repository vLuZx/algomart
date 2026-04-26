/**
 * Global error handling middleware
 */
export function errorHandler(error, req, res) {
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });
    const statusCode = error.statusCode || 500;
    const errorResponse = {
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(errorResponse);
}
/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=error-handler.middleware.js.map