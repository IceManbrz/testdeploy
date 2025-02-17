import { getServerSidePropsType, loggedInUserDataType } from '@/types';
import { deleteCookie, getCookie, hasCookie } from 'cookies-next';
import Head from "next/head";
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { BsPlus } from "react-icons/bs";
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import prisma from '@/prisma';
import Image from 'next/image';

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

        const ketentuan = await prisma.daftarSiswa.findMany()

        return {
            props: {
                user: userCookie,
                _symptoms: JSON.parse(JSON.stringify(ketentuan)),
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
    _symptoms: any;
}

const Admin = ({ user, _symptoms }: AdminProps) => {
    const [ketentuan, setSymptoms] = useState(() => [..._symptoms]);
    const [selectedSymptoms, setSelectedSymptoms] = useState<any[]>([]);
    const [fetchIsLoading, setFetchIsLoading] = useState<boolean>(false);

    const handleDeleteSelectedSymptoms = async () => {
        const fetchDeletePestAndDesease = (async () => {
            setFetchIsLoading(true);

            return await fetch('/api/nilaisiswa/tambahdata/', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedSymptoms,
                }),
            })
        })

        toast.promise(fetchDeletePestAndDesease()
            .then((res) => res.json())
            .then((res) => {
                setFetchIsLoading(false);
                setSymptoms(ketentuan.filter((symptom: any) => !selectedSymptoms.includes(symptom.id)));
                setSelectedSymptoms([]);
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

    const handleSelectOneSymptom = (id: number) => {
        if (selectedSymptoms.find((v) => v === id)) {
            setSelectedSymptoms(selectedSymptoms.filter((v) => v !== id))
        } else {
            setSelectedSymptoms([...selectedSymptoms, id])
        }
    }

    const handleToggleAll = () => {
        if (selectedSymptoms.length === ketentuan.length) {
            setSelectedSymptoms([])
        } else {
            setSelectedSymptoms(ketentuan.map((symptom: any) => symptom.id))
        }
    }

    return (
        <>
            <Head>
                <title>Data siswa</title>
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
                            Data siswa
                        </li>
                    </ul>
                </div>
                <div className="flex flex-col flex-wrap items-start justify-between lg:items-center lg:flex-row">
                    <h4 className="mb-2 text-xl font-bold">
                        Data pertanyaan
                    </h4>
                    <div className='flex flex-row-reverse items-center justify-center gap-4 lg:flex-row'>
                        {selectedSymptoms.length > 0 && (
                            <button className={`btn btn-error text-white ${fetchIsLoading ? "loading" : ""}`} onClick={handleDeleteSelectedSymptoms} disabled={fetchIsLoading}>Hapus {selectedSymptoms.length} Data</button>
                        )}
                        <Link className="btn btn-primary" href="/daftarsiswa/create"><BsPlus size={24} />Tambah Data</Link>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>
                                        <label>
                                            <input type="checkbox" className="checkbox" onChange={handleToggleAll} checked={
                                                selectedSymptoms.length === ketentuan.length ? true : false
                                            } disabled={fetchIsLoading} />
                                        </label>
                                    </th>
                                    <th>Nim</th>
                                    <th>Nama Lengkap</th>
                                    <th>Username</th>
                                    <th>Password</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ketentuan.length > 0 ? ketentuan.map((symptom: any, index: number) => (
                                    <tr key={index}>
                                        <th>
                                            <label>
                                                <input type="checkbox" className="checkbox" onChange={() => handleSelectOneSymptom(symptom.id)} checked={
                                                    selectedSymptoms.find((v) => v === symptom.id) ? true : false
                                                } disabled={fetchIsLoading} />
                                            </label>
                                        </th>
                                        <td>{`${symptom.nim}`}</td>
                                        <td>
                                        {`${symptom.fullname}`}
                                        </td>
                                        <td>{symptom.username}</td>
                                        <td>{symptom.password}</td>
                                        <td>
                                            <div className='flex flex-row items-center justify-start gap-2'>
                                                <Link href={`/daftarsiswa/edit/${symptom.id}`} className="btn btn-outline btn-info btn-xs">Ubah</Link>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center">
                                            <div className="text-gray-500">Tidak ada data pertanyaan</div>
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