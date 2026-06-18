import { Layout } from "@/components/Layout";
import { useParams } from "react-router-dom";
export default function WorkerBookingDetail() { const { id } = useParams(); return <Layout><div className="container py-8"><h1>Worker Booking Detail #{id}</h1></div></Layout>; }
