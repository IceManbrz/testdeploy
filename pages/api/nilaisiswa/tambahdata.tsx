import prisma from "@/prisma";
import { synchronizeUsersDiagnosesHistories } from "@/utils/synchronizeUsersDiagnosesHistories";
import { deleteCookie, getCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const isCookieExist = getCookie("user", { req, res });
    const userCookie = isCookieExist
        ? // @ts-ignore
        JSON.parse(getCookie("user", { req, res }))
        : null;

    if ((userCookie && userCookie.role !== "admin") || !userCookie) {
        return {
            redirect: {
                destination: "/login",
                permanent: true,
            },
        };
    }

    const foundedUser = await prisma.user.findUnique({
        where: {
            authToken: userCookie.authToken,
        },
    });

    if (!foundedUser) {
        deleteCookie("user", { req, res });
        return res.status(401).json({
            code: 401,
            message: "Unauthorized",
        });
    }

    const { method } = req;
    const { nim, fullname, username, password,}: { nim: string, fullname: string, username: string, password: string } = req.body;

    switch (method) {
        case "POST":
            try {
                const createSymptom = await prisma.daftarSiswa.create({
                    // @ts-ignore
                    data: {
                        nim,
                        fullname,
                        username,
                        password,
                        
                    },
                });

                if (!createSymptom) {
                    return res.status(404).json({
                        code: 404,
                        message: "Data  gagal disimpan",
                    });
                }

                await prisma.$disconnect();
                res.status(200).json({
                    code: 200,
                    message: "Berhasil menyimpan data ",
                    data: createSymptom,
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    code: 500,
                    message: "Gagal menyimpan data ",
                });
            }
            break;
        case "PUT":
            try {
                const updateSymptom = await prisma.daftarSiswa.update({
                    where: {
                        id: parseInt(req.body.symptomCode),
                    },
                    data: {
                        nim,
                        fullname,
                        username,
                        password,
                    
                    },
                });

                if (!updateSymptom) {
                    return res.status(404).json({
                        code: 404,
                        message: "Data  gagal diperbarui",
                    });
                }

                await prisma.$disconnect();
                res.status(200).json({
                    code: 200,
                    message: "Berhasil mengubah data ",
                    data: updateSymptom,
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    code: 500,
                    message: "Gagal mengubah data pertanyaan",
                });
            }
            break;
        case "DELETE":
            try {
                const symptomsOnPestsAndDeseasesHasSymptoms = await prisma.daftarSiswa.deleteMany({
                    where: {
                        id: {
                            in: req.body.selectedSymptoms,
                        }
                    }
                });

                if (!symptomsOnPestsAndDeseasesHasSymptoms) {
                    return res.status(404).json({
                        code: 404,
                        message: "Ketentuan tidak ditemukan",
                    });
                }

                const deleteSymptom = await prisma.daftarSiswa.deleteMany({
                    where: {
                        id: {
                            in: req.body.selectedSymptoms,
                        },
                    },
                });

                if (!deleteSymptom) {
                    return res.status(404).json({
                        code: 404,
                        message: "Ketentuan tidak ditemukan",
                    });
                }

                synchronizeUsersDiagnosesHistories();

                await prisma.$disconnect();

                res.status(200).json({
                    code: 200,
                    message: "Berhasil menghapus Ketentuan",
                    data: symptomsOnPestsAndDeseasesHasSymptoms,
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    code: 500,
                    message: "Gagal menghapus Ketentuan",
                });
            }
            break;
        default:
            res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
            res
                .status(405)
                .end({ code: 405, message: `Method ${method} Not Allowed` });
            break;
    }
}
