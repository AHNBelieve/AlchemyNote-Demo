import { Sparkles } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/living-context';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <article className={isUser ? 'chat-message user-message' : 'chat-message assistant-message'}>
      {!isUser ? <span className="assistant-mark"><Sparkles size={14} /></span> : null}
      <div className="message-content"><p>{message.content}</p></div>
    </article>
  );
}
