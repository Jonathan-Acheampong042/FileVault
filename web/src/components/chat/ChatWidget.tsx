import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ChatMessage from './ChatMessage'
import ChatAuthGate from './ChatAuthGate'
import { haptic } from '../../utils/haptics'

const SYSTEM_PROMPT_USER = `You are the FileVault AI assistant helping a regular user on the USER PAGE.
Keep your answers very brief and strictly related to FileVault user features (viewing, downloading, searching).`

const SYSTEM_PROMPT_MANAGER = `You are the FileVault AI assistant helping an admin or manager on the MANAGER PAGE.
Keep your answers brief and strictly related to Manager Portal features (uploading, managing users, scheduling).`

interface QuizQuestion {
  q: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  answer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

interface QuizResult {
  title: string
  score: number
  total: number
  pct: number
  date: string
  missed: Array<{
    q: string
    yourAnswer: string
    answer: string
    explanation: string
  }>
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, isOnline, offlineQueue, sendMessage, clearHistory } = useChat()
  const { session } = useAuth()
  const location = useLocation()
  
  const isManager = location.pathname.startsWith('/manager')
  const isLoginPage = location.pathname.startsWith('/login')
  const systemPrompt = isManager ? SYSTEM_PROMPT_MANAGER : SYSTEM_PROMPT_USER

  if (isLoginPage) return null;

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [score, setScore] = useState(0)
  const [missedQuestions, setMissedQuestions] = useState<QuizResult['missed']>([])
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Custom events for Ask AI and Quiz Me
  useEffect(() => {
    const handleAskAi = (e: Event) => {
      const file = (e as CustomEvent).detail
      if (!file) return

      setIsOpen(true)
      setIsQuizActive(false)
      setShowHistory(false)
      
      const folderStr = file.folder && file.folder !== 'Root' ? ` in the ${file.folder} folder` : ''
      const descStr = file.description ? ` (${file.description})` : ''
      const prompt = `Can you tell me what the file "${file.name}"${folderStr}${descStr} is likely about, and how it might help me as a student?`

      setTimeout(() => {
        sendMessage(prompt, systemPrompt)
      }, 200)
    }

    const handleQuizMe = (e: Event) => {
      const file = (e as CustomEvent).detail
      if (!file) return

      setIsOpen(true)
      startFileQuiz(file)
    }

    window.addEventListener('fv-ask-ai', handleAskAi)
    window.addEventListener('fv-quiz-me', handleQuizMe)
    return () => {
      window.removeEventListener('fv-ask-ai', handleAskAi)
      window.removeEventListener('fv-quiz-me', handleQuizMe)
    }
  }, [sendMessage])

  // Load quiz history from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fvQuizHistory')
      if (stored) setQuizHistory(JSON.parse(stored))
    } catch {}
  }, [])

  async function startFileQuiz(file: any) {
    setIsQuizActive(true)
    setQuizLoading(true)
    setShowHistory(false)
    setQuizQuestions([])
    setCurrentIdx(0)
    setSelectedOpt(null)
    setScore(0)
    setMissedQuestions([])

    const prompt = `You are a JSON-only quiz generator. Output only valid JSON.
Generate a 5-question multiple-choice quiz testing general knowledge of the broader academic subject area implied by this material:
Name: ${file.name}
Folder: ${file.folder || 'Root'}
Description: ${file.description || ''}

RULES:
- Inference: Infer the course or topic area from the file name/description. Do NOT quiz narrow facts about the file name itself (like "what letter does the file name start with"). Instead, generate FOUNDATIONAL university exam-style questions testing concepts related to that topic.
- Respond with 4 options labeled A, B, C, D.
- Output ONLY valid JSON containing a title and a questions array.

JSON FORMAT:
{
  "title": "Topic Quiz Title",
  "questions": [
    {
      "q": "Question text here?",
      "options": {
        "A": "Option A description",
        "B": "Option B description",
        "C": "Option C description",
        "D": "Option D description"
      },
      "answer": "A",
      "explanation": "Educational explanation of why the answer is correct."
    }
  ]
}`

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const apiHost = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://project-one-187u.onrender.com')
      const response = await fetch(`${apiHost}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: prompt,
          history: [],
          context: 'You are a JSON-only quiz generator. Output only valid JSON.'
        })
      })

      if (!response.ok) throw new Error('Quiz generation failed')
      const data = await response.json()
      
      const rawText = (data.reply || data.response || '').replace(/```json|```/g, '').trim()
      
      const startIdx = rawText.indexOf('{')
      const endIdx = rawText.lastIndexOf('}')
      if (startIdx === -1 || endIdx === -1) throw new Error('No JSON object found in response')
      
      const jsonStr = rawText.substring(startIdx, endIdx + 1)
      const parsed = JSON.parse(jsonStr)

      setQuizTitle(parsed.title || 'Subject Quiz')
      setQuizQuestions(parsed.questions || [])
    } catch (e) {
      console.error(e)
      setQuizTitle('Quiz Failed')
    } finally {
      setQuizLoading(false)
    }
  }

  function handleAnswer(opt: 'A' | 'B' | 'C' | 'D') {
    if (selectedOpt) return
    setSelectedOpt(opt)
    haptic('light')

    const currentQ = quizQuestions[currentIdx]
    const isCorrect = opt === currentQ.answer

    if (isCorrect) {
      setScore(s => s + 1)
    } else {
      setMissedQuestions(m => [...m, {
        q: currentQ.q,
        yourAnswer: currentQ.options[opt],
        answer: currentQ.options[currentQ.answer],
        explanation: currentQ.explanation
      }])
    }
  }

  function handleNext() {
    setSelectedOpt(null)
    if (currentIdx + 1 < quizQuestions.length) {
      setCurrentIdx(i => i + 1)
    } else {
      // Quiz Finished!
      haptic('success')
      saveQuizResult()
    }
  }

  function saveQuizResult() {
    const finalPct = Math.round(((score + (selectedOpt === quizQuestions[currentIdx].answer ? 1 : 0)) / quizQuestions.length) * 100)
    const newResult: QuizResult = {
      title: quizTitle,
      score: score + (selectedOpt === quizQuestions[currentIdx].answer ? 1 : 0),
      total: quizQuestions.length,
      pct: finalPct,
      date: new Date().toISOString(),
      missed: missedQuestions
    }

    const updated = [newResult, ...quizHistory].slice(0, 10)
    setQuizHistory(updated)
    localStorage.setItem('fvQuizHistory', JSON.stringify(updated))
    setCurrentIdx(quizQuestions.length) // triggers results display
  }

  function exportQuizResult() {
    const dateStr = new Date().toLocaleDateString()
    const lines = [
      '====================================',
      '        FileVault Quiz Result       ',
      '====================================',
      `Quiz:   ${quizTitle}`,
      `Date:   ${dateStr}`,
      `Score:  ${score} / ${quizQuestions.length} (${Math.round((score / quizQuestions.length) * 100)}%)`,
      ''
    ]

    if (missedQuestions.length > 0) {
      lines.push('--- Missed Questions ---')
      missedQuestions.forEach((m, idx) => {
        lines.push(`${idx + 1}. ${m.q}`)
        lines.push(`   Your Answer:    ${m.yourAnswer}`)
        lines.push(`   Correct Answer: ${m.answer}`)
        if (m.explanation) lines.push(`   Explanation:    ${m.explanation}`)
        lines.push('')
      })
    } else {
      lines.push('Perfect score! Great job! 🎉')
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FileVault_Quiz_${quizTitle.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 1000)
  }

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
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all hover:scale-110 active:scale-95 ${
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
        className={`fixed bottom-6 right-6 z-[9999] flex h-[600px] max-h-[85vh] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl transition-all duration-300 ${
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
                {isQuizActive ? 'Self-Study Quiz' : (
                  isOnline ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Offline Mode
                    </span>
                  )
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isQuizActive && (
              <button 
                onClick={() => setShowHistory(p => !p)}
                title="Quiz History"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${showHistory ? 'text-blue-400 bg-slate-700' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </button>
            )}
            {!isQuizActive && (
              <button 
                onClick={clearHistory}
                title="Clear History"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
            <button 
              onClick={toggleOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Dynamic Inner Panel (Quiz, History, or standard messages) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-900/60">
          
          {/* Quiz Scope Picker / Mode */}
          {isQuizActive ? (
            quizLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500 mb-3"></div>
                <p className="text-sm font-semibold">Generating subject quiz...</p>
                <p className="text-xs text-slate-500 mt-1">This will test your general course knowledge.</p>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                <p className="text-sm">Failed to generate quiz. Try again later.</p>
                <button
                  onClick={() => setIsQuizActive(false)}
                  className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Return to Chat
                </button>
              </div>
            ) : currentIdx < quizQuestions.length ? (
              /* Active Quiz Question Card */
              <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out_both]">
                <div className="flex justify-between items-center text-[10px] uppercase font-extrabold tracking-wider text-purple-400">
                  <span>{quizTitle}</span>
                  <span>Question {currentIdx + 1} of {quizQuestions.length}</span>
                </div>
                
                <p className="text-sm font-bold text-white leading-relaxed">
                  {quizQuestions[currentIdx].q}
                </p>

                <div className="space-y-2.5">
                  {(Object.keys(quizQuestions[currentIdx].options) as Array<'A'|'B'|'C'|'D'>).map(key => {
                    const optText = quizQuestions[currentIdx].options[key]
                    const isSelected = selectedOpt === key
                    const isAnswer = key === quizQuestions[currentIdx].answer
                    
                    let btnClass = 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    if (selectedOpt) {
                      if (isAnswer) {
                        btnClass = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                      } else if (isSelected) {
                        btnClass = 'border-red-500/40 bg-red-500/10 text-red-400 font-bold'
                      } else {
                        btnClass = 'border-transparent bg-white/2 opacity-40'
                      }
                    }

                    return (
                      <button
                        key={key}
                        disabled={!!selectedOpt}
                        onClick={() => handleAnswer(key)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-xs transition-all ${btnClass}`}
                      >
                        <span className="font-extrabold uppercase text-[13px]">{key}.</span>
                        <span>{optText}</span>
                      </button>
                    )
                  })}
                </div>

                {selectedOpt && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3 animate-[fadeInUp_0.2s_ease-out]">
                    <div className="flex items-center gap-2">
                      {selectedOpt === quizQuestions[currentIdx].answer ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs">
                          <span className="material-symbols-outlined text-sm">check_circle</span> Correct
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1 text-xs">
                          <span className="material-symbols-outlined text-sm">cancel</span> Incorrect
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {quizQuestions[currentIdx].explanation}
                    </p>
                    <button
                      onClick={handleNext}
                      className="w-full rounded-xl bg-purple-600 p-2.5 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
                    >
                      {currentIdx + 1 === quizQuestions.length ? 'Show Results' : 'Next Question'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Quiz Results Finished Screen */
              <div className="text-center py-6 space-y-4 animate-[fadeInUp_0.4s_ease-out]">
                <div className="text-5xl">
                  {score === quizQuestions.length ? '🏆' : score >= 3 ? '🎉' : '📚'}
                </div>
                <h4 className="text-lg font-extrabold text-white">Quiz Finished!</h4>
                <p className="text-2xl font-black text-purple-400">{score} / {quizQuestions.length}</p>
                
                <p className="text-xs text-slate-400">
                  {score === quizQuestions.length ? 'Perfect score! Brilliant work!' : score >= 3 ? 'Good effort!' : 'Keep studying!'}
                </p>

                <div className="flex gap-2 justify-center pt-4">
                  <button
                    onClick={exportQuizResult}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
                  >
                    Export Results
                  </button>
                  <button
                    onClick={() => setIsQuizActive(false)}
                    className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700"
                  >
                    Close Quiz
                  </button>
                </div>
              </div>
            )
          ) : showHistory ? (
            /* Quiz History View */
            <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out_both]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Quiz History</h4>
                <button 
                  onClick={() => {
                    localStorage.removeItem('fvQuizHistory')
                    setQuizHistory([])
                  }}
                  className="text-[10px] font-bold text-red-400 hover:underline"
                >
                  Clear History
                </button>
              </div>

              {quizHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No quiz records found.</p>
              ) : (
                <div className="space-y-2">
                  {quizHistory.map((q, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-200">{q.title}</p>
                        <p className="text-[10px] text-slate-500">{new Date(q.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-bold ${q.pct >= 85 ? 'text-emerald-400' : q.pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {q.score} / {q.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowHistory(false)}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs font-bold text-slate-300"
              >
                Back to Chat
              </button>
            </div>
          ) : !session ? (
            /* Auth Gate for unauthenticated users */
            <ChatAuthGate />
          ) : (
            /* Standard AI Chat Thread */
            <>
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-16">
                  <span className="material-symbols-outlined mb-3 text-5xl opacity-20">forum</span>
                  <p className="text-sm font-semibold text-slate-400">Hi! I'm your AI assistant.</p>
                  <p className="text-xs text-slate-500 mt-1">Ask me anything about FileVault lectures or features.</p>
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
            </>
          )}
        </div>

        {/* Offline Warning */}
        {!isOnline && !isQuizActive && (
          <div className="bg-amber-500/10 px-4 py-2 text-center text-[11px] text-amber-500">
            You are offline. Messages will be sent when you reconnect.
          </div>
        )}

        {/* Input Form (hidden in Quiz Mode or if not authenticated) */}
        {!isQuizActive && !showHistory && session && (
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
        )}
      </div>
    </>
  )
}
