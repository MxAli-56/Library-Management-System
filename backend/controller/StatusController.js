import prisma from "../config/db.js";

export const getAllStatuses = async (req, res) => {
  try {
    const { type } = req.query;

    const where = { deleted_at: null };

    if (type) {
      where.type = type;
    }

    const statuses = await prisma.status.findMany({
      where: where,
      orderBy: { name: "asc" },
      select: {
        status_id: true,
        name: true,
        type: true,
      },
    });

    return res.status(200).json({ data: statuses });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
