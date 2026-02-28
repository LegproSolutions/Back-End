import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

// Utility function to extract token from request (prefer httpOnly cookie for server-issued tokens)
const extractToken = (req) => {
  // Prefer httpOnly cookie issued by this backend
  const cookieToken = req.cookies?.token;
  if (cookieToken && cookieToken !== 'undefined' && cookieToken !== 'null') {
    req.tokenSource = 'cookie';
    return cookieToken;
  }

  // Fallback to Authorization Bearer header
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.split(' ')[1];
    if (headerToken && headerToken !== 'undefined' && headerToken !== 'null') {
      req.tokenSource = 'authorization';
      return headerToken;
    }
  }

  return undefined;
};

// Generic authentication middleware
const createAuthMiddleware = (Model, tokenKey = 'id') => {
  return async (req, res, next) => {
    // Extract token
    const token = extractToken(req);

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "No token provided, authorization denied" 
      });
    }

    try {
      // Verify token (explicitly restrict algorithm)
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });

      // Find entity in database
      const entity = await Model.findById(decoded[tokenKey]).select("-password");

      // Check if entity exists
      if (!entity) {
        return res.status(401).json({ 
          success: false, 
          message: `${Model.modelName} not found` 
        });
      }

      // Attach entity to request
      req[Model.modelName.toLowerCase()] = entity;
      next();

    } catch (error) {
      // Detailed error handling
      if (error.name === 'JsonWebTokenError') {
        // Differentiate invalid signature vs other JWT format issues
        const reason = error.message === 'invalid signature' ? 'Invalid token signature' : 'Invalid token';
        console.log('Authentication error (JWT):', { reason, source: req.tokenSource });
        return res.status(401).json({ 
          success: false, 
          message: reason 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: "Token has expired" 
        });
      }

      // Catch-all for other errors
      console.error('Authentication error:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Internal server error during authentication" 
      });
    }
  };
};

// Specific middleware for different entity types
export const protectAdmin = createAuthMiddleware(Admin);
export const protectCompany = createAuthMiddleware(Company);
export const authenticate = createAuthMiddleware(User, 'userId');

// Optional: Role-based access control middleware
export const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Access forbidden" 
      });
    }

    next();
  };
};

// Premium Access Middleware
export const checkPremiumAccess = (req, res, next) => {
  const company = req.company;

  if (!company || !company.havePremiumAccess) {
    return res.status(403).json({
      success: false,
      message: "Premium access required to access this resource",
    });
  }

  next();
};