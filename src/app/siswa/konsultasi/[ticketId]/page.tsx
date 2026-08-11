import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONTACTS } from "@/content/team";
import { ReplyForm } from "./ReplyForm";

export default async function KonsultasiThreadPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const session = await auth();

  const ticket = await prisma.consultTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.studentId !== session!.user.id) notFound();

  const waHotline = CONTACTS.whatsapp[0];

  return (
    <div>
      <p className="crumb">KONSULTASI</p>
      <h2 className="h2">{ticket.subject}</h2>
      <p className="sub">
        Balasan tim BK muncul di sini. Butuh jawaban cepat?{" "}
        <a href={waHotline.url} target="_blank" rel="noreferrer">
          Hubungi hotline WhatsApp
        </a>
        .
      </p>

      <div className="chat">
        {ticket.messages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--tinta-lembut)" }}>
            Belum ada pesan. Tulis pertanyaanmu di bawah.
          </p>
        )}
        {ticket.messages.map((m) => (
          <div key={m.id} className={`chat-pesan ${m.senderRole === "STUDENT" ? "saya" : ""}`}>
            <small>{m.senderRole === "STAFF" ? "Tim BK" : "Kamu"}</small>
            {m.body}
          </div>
        ))}
      </div>

      <ReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
