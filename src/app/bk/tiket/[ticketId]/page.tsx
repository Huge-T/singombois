import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReplyForm } from "./ReplyForm";

export default async function BkTicketThreadPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const session = await auth();

  const ticket = await prisma.consultTicket.findUnique({
    where: { id: ticketId },
    include: { student: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.student.schoolId !== session!.user.schoolId) notFound();

  return (
    <div>
      <p className="crumb">GURU BK · TIKET</p>
      <h2 className="h2">{ticket.student.name}</h2>
      <p className="sub">{ticket.subject}</p>

      <div className="chat">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`chat-pesan ${m.senderRole === "STAFF" ? "saya" : ""}`}>
            <small>{m.senderRole === "STAFF" ? "Tim BK" : ticket.student.name}</small>
            {m.body}
          </div>
        ))}
      </div>

      <ReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
