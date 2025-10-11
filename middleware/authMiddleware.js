import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

// Utility function to extract token from request
const extractToken = (req) => {
  // Check for token in Authorization header
  // if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
  //   return req.headers.authorization.split(' ')[1];
  // }
  // Check for token in cookies
  return req.cookies.token;
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
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token format" 
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