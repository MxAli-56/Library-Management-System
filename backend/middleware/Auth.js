import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const authenticate = (req,res,next) => {
    try {
        const header = req.headers.authorization

        if (!header){
            return res.status(401).json({message: "Token doesn't exist. Please login first"})
        }

        const token = header.split(' ')[1]

        if (!token){
            return res.status(401).json({message: "Invalid token format. Use Bearer <token>"})
        }

        const verifytoken = jwt.verify(token, process.env.JWT_SECRET)

        if(!verifytoken) {
            return res.status(401).json({message: "Invalid token. Please enter correct token"})
        }

        req.user = verifytoken

        next()

    } catch (error) {
        if (error.name === "JsonWebTokenError") {
          return res.status(401).json({
            message: "Invalid token. Please login again.",
          });
        }
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({
            message: "Token expired. Please login again.",
          });
        }

        return res.status(500).json({
          message: "Authentication error",
        });
    }
}

export default authenticate