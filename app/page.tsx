'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Spotlight } from '@/components/ui/spotlight-new'
import ReactMarkdown from 'react-markdown'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import NavBar from './components/NavBar'
import { HyperText } from '@/components/ui/hyper-text'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agentx402.onrender.com'
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'

const reimaginedTexts = [
  'Reimagined', 'Réimaginé', 'Reimaginado', '再構築', 'Neu erfunden',
  '재구성', 'تصور جديد', '重塑', 'Переосмыслено', 'Ripensato',
]

// 🧩 Message Type
type ChatMessage = {
  role: 'user' | 'ai'
  content: string
}

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Processing...')
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile') // 🦙 Default model = Groq Llama
  const [showHero, setShowHero] = useState(true)
  const chatRef = useRef<HTMLDivElement>(null)

  const { publicKey, signTransaction } = useWallet()
  const connection = new Connection(SOLANA_RPC, 'confirmed')

  // Auto scroll down when messages update
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Fade out hero when user submits first prompt
  useEffect(() => {
    if (messages.length > 0) setShowHero(false)
  }, [messages])

  const handleSubmit = async () => {
    // quick client-side validations
    if (!prompt.trim()) return setError('Please enter a prompt first.')
    if (!publicKey || !signTransaction) return setError('Please connect your Solana wallet.')

    // push user message immediately (chat UX)
    const userMessage = { role: 'user', content: prompt } as const
    setMessages((prev) => [...prev, userMessage])
    setPrompt('')
    setError(null)
    setLoading(true)
    setLoadingText('Requesting response...')

    // For debugging: build payload and full url
    const payload = {
      prompt,
      model: selectedModel,
      payer: publicKey.toBase58(),
    }
    const url = `${BACKEND_URL.replace(/\/$/, '')}/premium`

    // log everything to console (Network tab + server logs if proxied)
    console.info('x402 -> POST', url, payload)

    try {
      const r1 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Always collect text for debugging
      const text = await r1.text().catch(() => '')
      // Try parse JSON if possible
      let json: any = undefined
      try { json = text ? JSON.parse(text) : undefined } catch (e) { /* ignore */ }

      console.info('x402 <- status', r1.status, { text, json })

      if (r1.status === 200) {
        // if json parsed, prefer json.answer or json.ai; fall back to text
        const answer = json?.answer ?? json?.ai ?? text ?? 'No response.'
        const aiMessage = { role: 'ai', content: answer } as const
        setMessages((prev) => [...prev, aiMessage])
        setLoading(false)
        return
      }

      if (r1.status === 402) {
        // payment flow (unchanged)
        if (!json) throw new Error('payment required but backend response not JSON')
        const pr = json.paymentRequest
        if (!pr) throw new Error('paymentRequest missing in backend response')

        const toPubkey = new PublicKey(pr.receiver)
        const { blockhash } = await connection.getLatestBlockhash()

        const tx = new Transaction({
          recentBlockhash: blockhash,
          feePayer: publicKey,
        }).add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey,
            lamports: pr.amountLamports,
          })
        )

        const signedTx = await signTransaction(tx)
        const serializedTx = signedTx.serialize().toString('base64')

        setLoadingText('Confirming payment...')

        const r2 = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x402-signed-tx': serializedTx,
          },
          body: JSON.stringify(payload),
        })

        const text2 = await r2.text().catch(() => '')
        let json2: any = undefined
        try { json2 = text2 ? JSON.parse(text2) : undefined } catch (e) { }
        console.info('x402 <- second call status', r2.status, { text2, json2 })

        if (r2.status === 200) {
          const answer = json2?.ai ?? json2?.answer ?? text2 ?? 'No response.'
          const aiMessage = { role: 'ai', content: answer } as const
          setMessages((prev) => [...prev, aiMessage])
        } else {
          // show server message if available
          throw new Error(json2?.error ?? json2?.message ?? `Payment/LLM failed: ${r2.status} ${text2}`)
        }

        setLoading(false)
        return
      }

      // If we reach here: unexpected status (including 404)
      // Show a helpful message to the user and log the server text
      const serverMsg = json?.error ?? json?.message ?? text ?? `Status ${r1.status}`
      setError(`Unexpected backend response: ${r1.status} — ${serverMsg}`)
      console.warn('Unexpected backend response', r1.status, { serverMsg, url, payload })
      setLoading(false)
    } catch (err: any) {
      // network / fetch errors end up here
      console.error('handleSubmit error', err)
      setError(err.message ?? String(err))
      setLoading(false)
    }
  }


  return (
    <main className="relative flex flex-col items-center min-h-screen text-center bg-black text-white overflow-hidden transition-all duration-300">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-[url('/textures/leather-texture.png')] mix-blend-overlay opacity-20 bg-cover bg-center" />
      </div>

      <Spotlight />
      <NavBar />

      {/* Hero Section (fades & collapses on first prompt) */}
      <section
        className={`relative mx-auto w-full max-w-3xl z-10 flex flex-col items-center text-center mt-2 transform transition-all duration-1000 ease-in-out ${showHero
          ? 'opacity-100 translate-y-0 max-h-[800px] scale-100 pointer-events-auto'
          : 'opacity-0 -translate-y-32 max-h-0 scale-95 pointer-events-none overflow-hidden'
          }`}
      >
        {/* Floating Logo */}
        <div className="relative flex justify-center items-center -mt-6 -mb-20">
          <div className="relative w-[600px] h-[400px] flex items-center justify-center">
            <div className="absolute bottom-0 w-[80%] h-20 bg-linear-to-t from-white/10 to-transparent blur-3xl rounded-full opacity-70 animate-pulse-slow" />
            <Image
              src="/hero-logo.png"
              alt="x402 Logo"
              width={1000}
              height={300}
              priority
              className="object-contain select-none block drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-float"
              style={{ display: 'block' }}
            />
          </div>
        </div>

        {/* Hero Text */}
        <div className="text-center -mt-1">
          <h1 className="mt-0 text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-none bg-linear-to-r from-[#CFCFCF] via-[#EAEAEA] to-[#A8A8A8] bg-clip-text text-transparent">
            AI Access,{' '}
            <HyperText
              texts={reimaginedTexts}
              className="inline text-3xl sm:text-5xl md:text-6xl text-[#BEBEBE]"
            />{' '}
            for Web3.
          </h1>
          <h2 className="mt-1 text-2xl sm:text-3xl font-medium text-[#D4D4D8]">x402-GPT</h2>
          <p className="mt-4 text-lg leading-8 text-[#A1A1AA]">
            Developer-ready AI with transparent on-chain pricing.
          </p>
        </div>
      </section>

      {/* Chat Section */}
      <section ref={chatRef} className="relative z-20 flex flex-col items-center text-center mt-10 space-y-6 px-6 w-full max-w-3xl">
        {/* Messages */}
       {messages.length > 0 && (
  <div className="flex flex-col w-full space-y-6">
    {messages.map((msg, i) => (
      <div
        key={i}
        className={`transition-all animate-fadeInUp ${
          msg.role === 'user'
            ? 'flex justify-end text-right'
            : 'flex justify-start text-left'
        }`}
      >
        {msg.role === 'user' ? (
          // 🗨️ User Message Bubble
          <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-gray-100 backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.3)]">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="leading-relaxed" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="text-white" {...props} />
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        ) : (
          // 🤖 AI Response (no bubble — just on actual background)
          <div className="max-w-[90%] text-[#C9C9C9]">
            <ReactMarkdown
              components={{
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-semibold text-[#14F195] mt-6 mb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-semibold text-[#00E0FF] mt-4 mb-2" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="my-2 leading-relaxed" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="my-1 list-disc ml-6" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="text-white" {...props} />
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    ))}
  </div>
)}


        {/* Input box */}
        <div className="w-full bg-transparent mt-8">
          <div className="relative flex flex-col w-full p-4 rounded-2xl bg-[rgba(20,20,20,0.6)] border border-[rgba(255,255,255,0.1)] shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden space-y-3">
            <textarea
              placeholder="Ask me anything... (Shift + Enter for new line)"
              className="w-full min-h-[70px] max-h-[300px] resize-none bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none px-3 py-2 rounded-lg focus:ring-2 focus:ring-gray-700 transition-all"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />

            {/* Controls (Selector Left + Button Right) */}
            {/* Controls (Selector Left + Button Right) */}
            <div className="flex justify-between items-center mt-2 w-full">
              {/* Model Selector */}
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="
        appearance-none
        bg-[#111111]
        border border-[#2a2a2a]
        text-gray-300 text-sm
        rounded-lg px-4 py-2
        focus:outline-none
        focus:ring-2 focus:ring-gray-700
        hover:border-gray-500
        transition-all
        cursor-pointer
        font-medium
        pr-8
      "
                >
                  <option className="bg-[#111111] text-gray-300" value="llama-3.3-70b-versatile">
                    Groq (LLaMA 3.3 - 70B)
                  </option>
                  <option className="bg-[#111111] text-gray-300" value="gemini-2.0-flash">
                    Gemini 2.0 Flash
                  </option>
                  <option className="bg-[#111111] text-gray-300" value="gemini-2.5-pro">
                    Gemini 2.5 Pro
                  </option>
                  <option className="bg-[#111111] text-gray-300" value="gpt-3.5-turbo">
                    GPT-3.5 Turbo
                  </option>
                </select>

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs">
                  ▼
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="
      bg-white/10 hover:bg-white/20
      hover:scale-[1.04] active:scale-[0.98]
      transition-transform duration-300
      px-6 py-2 rounded-full font-medium text-sm text-white
      shadow-[0_0_10px_rgba(255,255,255,0.1)]
      disabled:opacity-50
    "
              >
                {loading ? loadingText : 'Submit'}
              </button>
            </div>

          </div>
        </div>

        {error && <div className="mt-6 text-red-500 text-sm">⚠ {error}</div>}
      </section>

      <footer className="mt-auto py-8 text-xs text-gray-500">Powered by x402 • Solana Devnet</footer>

      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
    </main>
  )
}
