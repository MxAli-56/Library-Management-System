import prisma from "../config/db.js"

export const requiredAccess = (requiredStamp) => {
    return async(req,res,next) => {
        try {
            const userID = req.user?.id

            if (!userID){
                return res.status(400).json({message: "Unauthorized: No user found in request"})
            }

            const userRoles = await prisma.user_role.findMany({
                where: {
                    user_id: userID,
                    deleted_at: null
                },
                select:{
                    role_id: true
                }
            })

            if (userRoles.length === 0){
                return res.status(403).json({message: "Access denied: No roles assigned"})
            }

            const roleIDs = userRoles.map((ur) => ur.role_id)
   

            const hasAccess = await prisma.role_access.findFirst({
                where: {
                    role_id: { in: roleIDs },
                accessrole: {
                    name: requiredStamp
                }
            }
            })

            if (!hasAccess) {
                return res.status(403).json({message: "Access denied. You don't have permission to access this"})
            }

            next()

        } catch (error) {
            console.error(error);
            return res.status(500).json({message: "Internal Server Error"})
        }
    }
}