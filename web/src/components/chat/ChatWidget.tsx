import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChat } from '../../hooks/useChat'
import ChatMessage from './ChatMessage'

const SYSTEM_PROMPT_USER = `You are the FileVault AI assistant helping a regular user on the USER PAGE.
Keep your answers very brief and strictly related to FileVault user features (viewing, downloading, searching).`

const SYSTEM_PROMPT_MANAGER = `You are the FileVault AI assistant helping an admin or manager on the MANAGER PAGE.
Keep your answers brief and strictly related to Manager Portal features (uploading, managing users, scheduling).`

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, isOnline, offlineQueue, sendMessage, clearHistory } = useChat()
  const location = useLocation()
  
  const isManager = location.pathname.startsWith('/manager')
  const systemPrompt = isManager ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_USER

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input, systemPrompt)
    setInput('')
  }

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <span className="material-symbols-outlined text-3xl">chat</span>
        {offlineQueue.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {offlineQueue.length}
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-10 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-700">
              <img src="/filevault-logo.png" alt="AI" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">FileVault AI</h3>
              <p className="text-[11px] text-slate-400">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Offline Mode
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={clearHistory}
              title="Clear History"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
            <button 
              onClick={toggleOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <span className="material-symbols-outlined mb-3 text-5xl opacity-20">forum</span>
              <p className="text-sm">Hi! I'm your AI assistant.</p>
              <p className="text-xs">Ask me anything about FileVault.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          
          {loading && (
            <div className="flex w-full justify-start mb-4">
              <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-amber-500/10 px-4 py-2 text-center text-[11px] text-amber-500">
            You are offline. Messages will be sent when you reconnect.
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isOnline ? "Ask AI a question..." : "Type a message to queue..."}
              className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-[14px] text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
