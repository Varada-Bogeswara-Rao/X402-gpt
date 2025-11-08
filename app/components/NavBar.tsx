
'use client'

import React from 'react'
import { WalletButton } from '@/providers/SolanaProvider'

export default function NavBar() {
  return (
    <nav className="w-full max-w-6xl mx-auto flex justify-between items-center py-6 px-6 border-b border-white/10">
      {/* Logo */}
      <div className="flex items-center gap-2 text-xl font-semibold">
        <span className="bg-linear-to-r from-[#14F195] to-[#9945FF] bg-clip-text text-transparent">
          X402
        </span>
        <span className="text-gray-300">Dev</span>
      </div>

      {/* Wallet Connect */}
      <WalletButton />
    </nav>
  )
}
