import { getServerSidePropsType, loggedInUserDataType } from '@/types';
import { deleteCookie, getCookie, hasCookie } from 'cookies-next';
import Head from "next/head";
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BsPlus } from "react-icons/bs";
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import prisma from '@/prisma';

export async function getServerSideProps({ req, res }: getServerSidePropsType) {
    const isCookieExist = hasCookie("user", { req, res });

    try {
        // @ts-ignore
        const userCookie = isCookieExist ? JSON.parse(getCookie("user", { req, res })) : null;

        if (userCookie && userCookie.role !== 'admin' || !userCookie) {
            return {
                redirect: {
                    destination: '/login',
                    permanent: true,
                }
            }
        }

        const foundedUser = await prisma.user.findUnique({
            where: {
                authToken: userCookie.authToken,
            }
        });
        if (!foundedUser) {
            deleteCookie("user", { req, res });
            return {
                redirect: {
                    destination: '/login?code=403',
                    permanent: true,
                }
            }
        }

        const jurusan = await prisma.jurusan.findMany({
            include: {
                Rules: {
                    include: {
                        ketentuan: true,
                    },
                },
            },
        })

        return {
            props: {
                user: userCookie,
                _jurusan: JSON.parse(JSON.stringify(jurusan)),
            }
        }
    } catch (error) {
        console.error(error)
        return {
            redirect: {
                destination: '/login?code=403',
                permanent: true,
            }
        };
    }
}

type AdminProps = {
    user: loggedInUserDataType;
    _jurusan: any;
}

const Admin = ({ user, _jurusan }: AdminProps) => {
    const [jurusan, setjurusan] = useState(() => [..._jurusan]);
    const [selectedPestsDeseases, setSelectedjurusan] = useState<any[]>([]);
    const [fetchIsLoading, setFetchIsLoading] = useState<boolean>(false);

    const handleDeleteSelectedPestsAndDeseases = async () => {
        const fetchDeletePestAndDesease = (async () => {
            setFetchIsLoading(true);

            return await fetch('/api/admin/jurusan', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedPestsDeseases,
                }),
            })
        })

        toast.promise(fetchDeletePestAndDesease()
            .then((res) => res.json())
            .then((res) => {
                setFetchIsLoading(false);
                setjurusan(jurusan.filter((pd: any) => !selectedPestsDeseases.includes(pd.code)));
                setSelectedjurusan([]);
            })
            .catch(() => {
                toast.error('Sistem gagal menghapus data, ada kesalahan pada sistem', {
                    duration: 5000,
                });
                setFetchIsLoading(false);
            }), {
            loading: 'Sistem sedang menghapus data...',
            success: 'Sistem berhasil menghapus data',
            error: 'Sistem gagal menghapus data',
        }, {
            duration: 5000,
        });
    }

    const handleSelectOnePestDesease = (jurusanCode: number) => {
        if (selectedPestsDeseases.find((v) => v === jurusanCode)) {
            setSelectedjurusan(selectedPestsDeseases.filter((v) => v !== jurusanCode))
        } else {
            setSelectedjurusan([...selectedPestsDeseases, jurusanCode])
        }
    }

    const handleToggleAll = () => {
        if (selectedPestsDeseases.length === jurusan.length) {
            setSelectedjurusan([])
        } else {
            setSelectedjurusan(jurusan.map((pd: any) => pd.code))
        }
    }

    return (
        <>
            <Head>
                <title>Dashboard Admin</title>
                <meta name="description" content="." />
            </Head>
            <Navbar userFullname={user.fullname} role={user.role} />
            <main className="safe-horizontal-padding my-[16px] md:my-[48px]">
                <div className="text-sm breadcrumbs">
                    <ul>
                        <li>
                            <Link href="/admin">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 mr-2 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                Dashboard Admin
                            </Link>
                        </li>
                        <li>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 mr-2 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                            Data penjurusan
                        </li>
                    </ul>
                </div>
                <div className="flex flex-col flex-wrap items-start justify-between lg:items-center lg:flex-row">
                    <h4 className="mb-2 text-xl font-bold">
                        Data penjurusan
                    </h4>
                    <div className='flex flex-row-reverse items-center justify-center gap-4 lg:flex-row'>
                        {selectedPestsDeseases.length > 0 && (
                            <button className={`btn btn-error text-white ${fetchIsLoading ? "loading" : ""}`} onClick={handleDeleteSelectedPestsAndDeseases} disabled={fetchIsLoading}>Hapus {selectedPestsDeseases.length} Data</button>
                        )}
                        <Link className="btn btn-primary" href="/admin/jurusan/create"><BsPlus size={24} />Tambah Data</Link>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>
                                        <label>
                                            <input type="checkbox" className="checkbox" onChange={handleToggleAll} checked={selectedPestsDeseases.length === jurusan.length} disabled={fetchIsLoading} />
                                        </label>
                                    </th>
                                    <th>Kode</th>
                                    <th>Nama jurusan</th>
                                    <th>Ketentuan Terkait</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jurusan.length > 0 ? jurusan.map((pd: any, index: number) => (
                                    <tr key={index}>
                                        <th>
                                            <label>
                                                <input type="checkbox" className="checkbox" onChange={() => handleSelectOnePestDesease(pd.code)} checked={
                                                    selectedPestsDeseases.find((v) => v === pd.code) ? true : false
                                                } disabled={fetchIsLoading} />
                                            </label>
                                        </th>
                                        <td>{`${pd.code}`}</td>
                                        <td>{pd.name}</td>
                                        <td>
                                            <span className='max-w-[100px] lg:max-w-[200px] overflow-x-auto flex flex-wrap'>
                                                {pd.Rules.length > 0 ?
                                                    pd.Rules.map((item: any, index: number) => (
                                                        <span key={index}>
                                                            {item.ketentuan.code}
                                                            {index === pd.Rules.length - 1 ? "" : <span>,&nbsp;</span>}
                                                        </span>
                                                    )) : (
                                                        <span className='text-xs font-bold text-red-500'>*Rule Belum Diatur</span>
                                                    )}
                                            </span>
                                        </td>
                                        <td>
                                            <span className='flex flex-row items-center justify-start gap-2'>
                                                <Link href={`/admin/jurusan/edit/${pd.code}`} className="btn btn-outline btn-info btn-xs">Ubah</Link>
                                                <Link href={`/admin/jurusan/set-rule/${pd.code}`} className="btn btn-outline btn-accent btn-xs">Atur Rule</Link>
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center">
                                            <div className="text-gray-500">Tidak ada data penjurusan</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </>
    )
}

export default Admin;