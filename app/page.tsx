'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { VersionedTransaction } from '@solana/web3.js'
import NavBar from './components/NavBar'
import ReactMarkdown from 'react-markdown'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export default function Page() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Processing...')
  const [error, setError] = useState<string | null>(null)

  // wallet adapter
  const { publicKey, signTransaction } = useWallet()

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setAnswer(null)
    setError(null)
    setLoadingText('Requesting payment details...')

    try {
      // 1) Ask backend for a payment request (unsigned tx)
      const res = await fetch(`${BACKEND_URL}/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: 'gemini-2.5-pro', payer: publicKey?.toBase58() }),
      })

      // If backend asks for payment, it'll return status 402 + paymentRequest
      if (res.status === 402) {
        const { paymentRequest } = await res.json()

        // Ensure wallet is connected
        if (!publicKey) throw new Error('Please connect your wallet to proceed with payment.')
        if (!signTransaction) throw new Error('Wallet does not support signTransaction interface.')

        // 2) Decode unsigned transaction
        setLoadingText('Preparing transaction for signing...')
        let txBuffer: Buffer
        try {
          txBuffer = Buffer.from(paymentRequest.txBase64, 'base64')
        } catch {
          throw new Error('Invalid txBase64 from backend.')
        }

        let unsignedTx: VersionedTransaction
        try {
          unsignedTx = VersionedTransaction.deserialize(txBuffer)
        } catch (err) {
          console.error('deserialize error', err)
          throw new Error('Backend tx is not a valid Solana VersionedTransaction.')
        }

        // 3) Ask wallet to sign
        setLoadingText('Waiting for wallet signature...')
        let signedTx: VersionedTransaction
        try {
          signedTx = await signTransaction(unsignedTx)
        } catch (err: any) {
          console.error('signTransaction failed', err)
          throw new Error(err?.message || 'Transaction signing cancelled or failed.')
        }

        // 4) Send signed tx back
        const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')
        setLoadingText('Submitting signed transaction to backend...')

        const payRes = await fetch(`${BACKEND_URL}/premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x402-signed-tx': signedTxBase64 },
          body: JSON.stringify({ prompt, model: 'gemini-2.5-pro', payer: publicKey?.toBase58() }),
        })

        const data = await payRes.json()
        if (!payRes.ok) throw new Error(data.error || data.message || 'Payment verification failed')

        setAnswer(data.ai || 'No response')
        setLoadingText('Processing complete')
        return
      }

      const data = await res.json()
      setAnswer(data.ai || 'No response')
    } catch (err: any) {
      console.error(err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
      setLoadingText('Processing...')
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-linear-to-br from-[#0b0b1c] to-[#2a1a40] text-white transition-all duration-300">      <NavBar />

      <section className="flex flex-col items-center text-center mt-24 space-y-6 px-6 w-full max-w-3xl">
        <h1 className="text-4xl font-bold bg-linear-to-r from-[#14F195] to-[#00E0FF] bg-clip-text text-transparent">
          x402-GPT Playground
        </h1>
        <p className="text-gray-400">Pay-per-query intelligence on-chain</p>

        {/* 🌊 Liquid Glass Input Box */}
        <div
          className="
    relative flex flex-col w-full mt-4 p-6 rounded-2xl
    bg-[rgba(25,25,40,0.35)]
    border border-[rgba(255,255,255,0.08)]
    shadow-[0_20px_80px_rgba(0,0,0,0.6)]
    backdrop-blur-2xl
    overflow-hidden
    liquid-glass
  "
        >

          <textarea
            placeholder="Ask me anything... (Shift + Enter for new line)"
            className="
              w-full min-h-[70px] max-h-[300px] resize-none
              bg-transparent text-gray-100 placeholder-gray-500
              focus:outline-none px-3 py-2 rounded-lg
              focus:ring-2 focus:ring-[#14F195]/40 transition-all
            "
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="
                bg-linear-to-r from-[#9945FF] to-[#14F195]
                hover:opacity-90 hover:scale-[1.04]
                active:scale-[0.98]
                transition-transform duration-300
                px-6 py-2 rounded-full font-medium text-sm
                text-white shadow-[0_0_20px_rgba(20,241,149,0.4)]
                disabled:opacity-50
              "
            >
              {loading ? loadingText : 'Pay 0.5 USDC'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-8 text-gray-400 text-sm italic">{loadingText}</div>
        )}

        {answer && !loading && (
          <div className="mt-10 w-full max-w-3xl text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 leading-relaxed text-gray-100 shadow-[0_0_20px_rgba(153,69,255,0.15)] backdrop-blur-lg">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-semibold text-[#14F195] mt-6 mb-2 border-b border-white/10 pb-1" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-semibold text-[#00E0FF] mt-4 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="my-3 leading-relaxed text-gray-300" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="my-1 text-gray-300" {...props} />
                  ),
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {error && <div className="mt-6 text-red-400 text-sm">⚠️ {error}</div>}

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm text-gray-300 max-w-2xl">
          {[
            'Analyse Macro and suggest BTC short term vs long term scenario.',
            "What’s happening in the market this week?",
            'Check if RSI + Bollinger setup on LINK is a good long entry.',
          ].map((text, i) => (
            <button
              key={i}
              onClick={() => setPrompt(text)}
              className="px-4 py-2 border border-white/10 rounded-lg hover:border-[#14F195] hover:text-white transition"
            >
              {text}
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-auto py-8 text-xs text-gray-500">
        Transactions powered by x402 • Solana network
      </footer>
    </main>
  )
}
