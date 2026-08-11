import { ChatMessage as ChatMessageType } from '../../hooks/useChat'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
          isUser 
            ? 'rounded-tr-sm bg-blue-500 text-white' 
            : 'rounded-tl-sm border border-slate-700 bg-slate-800 text-slate-200'
        }`}
      >
        {/* Simple markdown bold/italic parsing could go here, but for now just text */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        
        {!isUser && (
          <div className="absolute -left-10 bottom-0 h-8 w-8 rounded-full border border-slate-700 bg-slate-900 p-1 hidden sm:block">
            <img src="/filevault-logo.png" alt="AI" className="h-full w-full object-contain" />
          </div>
        )}
      </div>
    </div>
  )
}
