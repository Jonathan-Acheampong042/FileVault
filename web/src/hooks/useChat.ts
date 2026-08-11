import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CHAT_API_URL = import.meta.env.DEV 
  ? 'http://localhost:3000/api/chat' 
  : 'https://project-one-187u.onrender.com/api/chat'

const HISTORY_KEY = 'fvChatHistory'
const HISTORY_MAX = 20
const OFFLINE_QUEUE_KEY = 'fvChatOfflineQueue'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueue, setOfflineQueue] = useState<{ text: string, ts: number }[]>([])

  // Load history and queue on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY)
      if (savedHistory) setMessages(JSON.parse(savedHistory))
      
      const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (savedQueue) setOfflineQueue(JSON.parse(savedQueue))
    } catch (e) {
      console.warn('Failed to load chat history', e)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Save history on change
  useEffect(() => {
    try {
      const tail = messages.slice(-HISTORY_MAX)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(tail))
    } catch (e) {}
  }, [messages])

  // Save queue on change
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue))
    } catch (e) {}
  }, [offlineQueue])

  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem(HISTORY_KEY)
  }

  const sendMessage = async (text: string, systemPromptContext?: string) => {
    if (!text.trim()) return

    const newMessage: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, newMessage])
    
    if (!isOnline) {
      setOfflineQueue(prev => [...prev, { text, ts: Date.now() }])

      // Request background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          // @ts-ignore
          reg.sync.register('chat-message-sync').catch(() => {})
        }).catch(() => {})
      }

      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Send the last few messages for context
      const historyToSend = messages.slice(-10)

      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: historyToSend,
          context: systemPromptContext
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.response || "I didn't understand that." }])
      
    } catch (e) {
      console.error('Chat error:', e)
      // If it failed due to network, queue it
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        setOfflineQueue(prev => [...prev, { text, ts: Date.now() }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-flush offline queue when back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !loading) {
      const nextMsg = offlineQueue[0]
      const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
      
      if (Date.now() - nextMsg.ts > MAX_AGE) {
        setOfflineQueue(prev => prev.slice(1))
      } else {
        setOfflineQueue(prev => prev.slice(1))
        setMessages(prev => [...prev, { role: 'assistant', content: '🟢 Back online — sending your queued message...' }])
        sendMessage(nextMsg.text)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, offlineQueue, loading])

  // Listen for background sync messages from Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_SYNC_CHAT') {
        if (!isOnline) setIsOnline(true)
      }
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [isOnline])

  return {
    messages,
    loading,
    isOnline,
    offlineQueue,
    sendMessage,
    clearHistory
  }
}
