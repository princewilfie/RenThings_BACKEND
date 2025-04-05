const activityLogService = require('../activity-logs/activity-log.service');

module.exports = function(req, res, next) {
    // Original end function
    const originalEnd = res.end;
    
    // Override end function
    res.end = function(chunk, encoding) {
        // Only log certain routes and methods
        if (shouldLogActivity(req)) {
            const action = determineAction(req);
            const userId = req.auth ? req.auth.id : null;
            const username = req.auth ? 
                (req.auth.acc_firstName && req.auth.acc_lastName ? 
                    `${req.auth.acc_firstName} ${req.auth.acc_lastName}` : 'Unknown User') : 
                'Anonymous';
            
            activityLogService.logActivity({
                userId,
                username,
                action,
                ipAddress: req.ip
            }).catch(err => console.error('Failed to log activity:', err));
        }
        
        // Call original end function
        originalEnd.apply(res, arguments);
    };
    
    next();
};

function shouldLogActivity(req) {
    // Define paths and methods to log
    const loggablePaths = [
        '/account/authenticate',
        '/account/register',
        '/account/verify-email',
        '/account/reset-password',
        '/account/revoke-token'
    ];
    
    // Admin actions
    if (req.auth && req.auth.role === 'Admin') {
        return true;
    }
    
    // Specific routes
    return loggablePaths.some(path => req.path.startsWith(path));
}

function determineAction(req) {
    // Determine action based on path and method
    const path = req.path;
    const method = req.method;
    
    if (path.includes('/authenticate') && method === 'POST') {
        return 'Login attempt';
    }
    
    if (path.includes('/register') && method === 'POST') {
        return 'Registration';
    }
    
    if (path.includes('/verify-email') && method === 'POST') {
        return 'Email verification';
    }
    
    if (path.includes('/reset-password') && method === 'POST') {
        return 'Password reset';
    }
    
    if (path.includes('/revoke-token') && method === 'POST') {
        return 'Logout';
    }
    
    // For admin actions on accounts
    if (path.match(/\/account\/\d+/) && method === 'PUT') {
        return 'Account update';
    }
    
    if (path.match(/\/account\/\d+/) && method === 'DELETE') {
        return 'Account deletion';
    }
    
    return `${method} ${path}`;
}