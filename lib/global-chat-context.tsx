"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

// Define types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface GlobalChatContextType {
  // Current chat state
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Tool states
  isGeneratingImage: boolean;
  setIsGeneratingImage: (generating: boolean) => void;
  isSearchingWeb: boolean;
  setIsSearchingWeb: (searching: boolean) => void;
  searchResults: any[] | null;
  setSearchResults: (results: any[] | null) => void;
  uploadedFiles: any[];
  setUploadedFiles: (files: any[]) => void;
  
  // Chat history
  chatHistory: Chat[];
  setChatHistory: (history: Chat[]) => void;
  selectedChatId: string | null;
  setSelectedChatId: (id: string) => void;
  
  // Functions
  createNewChat: () => void;
  loadChat: (chatId: string) => Promise<void>;
  saveCurrentChat: () => Promise<void>;
  loadChatHistory: () => Promise<void>;
  
  // User info
  currentUser: any;
}

const GlobalChatContext = createContext<GlobalChatContextType | undefined>(undefined)

export function GlobalChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Initialize with system message for mining
  const getInitialMessages = (): Message[] => {
    const systemContent = `You are Lithos AI, an expert mining industry assistant with real-time web search capabilities. You specialize in:

- Mining project analysis and discovery
- Commodity market trends and pricing
- Technical mining reports and feasibility studies (NI 43-101, JORC, etc.)
- Environmental and ESG considerations in mining
- Geological and resource estimation
- Mining finance and investment analysis

You can search the web for current mining news, analyze technical documents and spreadsheets, generate mining-related visualizations, and provide up-to-date industry insights. When web search is enabled, you have access to current information from mining news sites, technical report databases (SEDAR, EDGAR), commodity exchanges, and industry sources.

Always provide data-driven insights and cite sources when available. Focus on accuracy and technical precision while remaining accessible.`;
    
    return [
      {
        id: "1",
        role: "system",
        content: systemContent
      },
      {
        id: "2",
        role: "assistant",
        content: "Hello! I'm Lithos AI, your mining industry assistant. I can help you with:\n\n• **Project Analysis** - Analyze mining projects, feasibility studies, and technical reports\n• **Market Intelligence** - Track commodity prices, market trends, and industry news\n• **Document Analysis** - Process technical reports, spreadsheets, and geological data\n• **Web Search** - Find the latest mining news and developments\n• **Visualizations** - Generate charts, maps, and project comparisons\n\nHow can I assist you today?"
      }
    ];
  };
  
  const initialMessages = getInitialMessages();

  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSearchingWeb, setIsSearchingWeb] = useState(false)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [chatHistory, setChatHistory] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const currentUser = user

  // Create new chat
  const createNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    const newMessages = getInitialMessages()
    
    setCurrentChatId(newChatId)
    setMessages(newMessages)
    setInput("")
    setUploadedFiles([])
    setSearchResults(null)
    setIsGeneratingImage(false)
    setIsSearchingWeb(false)
    
    // Add to history
    const newChat: Chat = {
      id: newChatId,
      title: "New Mining Analysis",
      messages: newMessages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setChatHistory(prev => [newChat, ...prev])
    setSelectedChatId(newChatId)
  }

  // Load a specific chat
  const loadChat = async (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages(chat.messages)
      setSelectedChatId(chatId)
      setInput("")
      setUploadedFiles([])
      setSearchResults(null)
      setIsGeneratingImage(false)
      setIsSearchingWeb(false)
    }
  }

  // Save current chat
  const saveCurrentChat = async () => {
    if (!currentChatId) return
    
    // Update chat in history
    setChatHistory(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Generate title from first user message if needed
        let title = chat.title
        if (title === "New Mining Analysis" && messages.length > 2) {
          const firstUserMessage = messages.find(m => m.role === "user")
          if (firstUserMessage) {
            title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
          }
        }
        
        return {
          ...chat,
          title,
          messages,
          updatedAt: new Date().toISOString()
        }
      }
      return chat
    }))
    
    // If Supabase is available, save to database
    if (currentUser && supabase()) {
      try {
        const supabaseClient = supabase()
        if (supabaseClient) {
          await supabaseClient
            .from('chat_history')
            .upsert({
              id: currentChatId,
              user_id: currentUser.id,
              title: messages.length > 2 ? messages[2]?.content?.substring(0, 50) + "..." : "New Mining Analysis",
              messages: messages,
              updated_at: new Date().toISOString()
            })
        }
      } catch (error) {
        console.error('Error saving chat:', error)
      }
    }
  }

  // Load chat history
  const loadChatHistory = async () => {
    if (!currentUser || !supabase()) return
    
    try {
      const supabaseClient = supabase()
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('chat_history')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(50)
        
        if (data && !error) {
          setChatHistory(data.map((chat: any) => ({
            id: chat.id,
            title: chat.title,
            messages: chat.messages,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at
          })))
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  // Auto-save when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 2) {
      const timer = setTimeout(() => {
        saveCurrentChat()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [messages, currentChatId])

  // Load chat history on user change
  useEffect(() => {
    if (currentUser) {
      loadChatHistory()
    }
  }, [currentUser])

  // Initialize with a new chat
  useEffect(() => {
    if (!currentChatId) {
      createNewChat()
    }
  }, [])

  const value = {
    messages,
    setMessages,
    currentChatId,
    setCurrentChatId,
    input,
    setInput,
    isLoading,
    setIsLoading,
    isGeneratingImage,
    setIsGeneratingImage,
    isSearchingWeb,
    setIsSearchingWeb,
    searchResults,
    setSearchResults,
    uploadedFiles,
    setUploadedFiles,
    chatHistory,
    setChatHistory,
    selectedChatId,
    setSelectedChatId,
    createNewChat,
    loadChat,
    saveCurrentChat,
    loadChatHistory,
    currentUser,
  }

  return (
    <GlobalChatContext.Provider value={value}>
      {children}
    </GlobalChatContext.Provider>
  )
}

export function useGlobalChat() {
  const context = useContext(GlobalChatContext)
  if (!context) {
    throw new Error("useGlobalChat must be used within a GlobalChatProvider")
  }
  return context
} 