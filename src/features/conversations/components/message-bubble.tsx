import { Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Conversation, ConversationMessage } from "@/schema/conversationSchema";

export function MessageBubble({ message, participants, userId }: { message: ConversationMessage; participants: Conversation["participants"]; userId: string }) {
  const isMine = message.senderId === userId;
  const sender = participants.find((participant) => participant._id === message.senderId);
  const name = isMine ? "You" : [sender?.fName, sender?.lName].filter(Boolean).join(" ") || "Participant";
  return <li className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
    {!isMine ? <Avatar className="mb-1"><AvatarImage src={sender?.avatar ?? undefined} alt="" /><AvatarFallback>{sender?.fName?.[0]}{sender?.lName?.[0]}</AvatarFallback></Avatar> : null}
    <article aria-label={`Message from ${name}`} className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${isMine ? "rounded-br-sm bg-main text-main-foreground" : "rounded-bl-sm border border-outline bg-surface text-ink"}`}>
      <p className={`mb-1 text-xs font-semibold ${isMine ? "text-main-foreground" : "text-ink-muted"}`}>{name}</p>
      {message.content ? <p className="whitespace-pre-wrap text-sm leading-7 wrap-anywhere">{message.content}</p> : null}
      {message.attachmentCount ? <p className="mt-2 flex items-center gap-1 text-xs"><Paperclip className="size-3" aria-hidden="true" />{message.attachmentCount} {message.attachmentCount === 1 ? "attachment" : "attachments"} · Preview unavailable</p> : null}
      <time dateTime={message.createdAt} className="mt-2 block text-right text-[0.6875rem] opacity-80">{new Date(message.createdAt).toLocaleString()}</time>
    </article>
  </li>;
}
