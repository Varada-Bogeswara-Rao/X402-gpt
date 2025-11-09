'use client'

import React from 'react'
import { WalletButton } from '@/providers/SolanaProvider'

export default function NavBar() {
  return (
    <nav className="w-full max-w-7xl mx-auto flex justify-between items-center py-6 px-6 border-b border-white/10">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 text-xl font-semibold">
        <span className="text-white">X402</span>
        <span className="text-gray-400">Dev</span>
      </div>

      {/* Right: Devnet Indicator + Wallet Button */}
      <div className="flex items-center ml-auto gap-6">
        {/* Devnet Status */}
        <div className="flex items-center select-none animate-pulse">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300 shadow-[0_0_10px_2px_rgba(255,215,100,0.8)]"></span>
          </span>
          <span className="text-sm font-semibold text-yellow-300 drop-shadow-[0_0_6px_rgba(255,255,180,0.6)] tracking-wide">
            Works only on Devnet
          </span>
        </div>

        {/* Wallet Button */}
        <div className="shrink-0">
          <WalletButton
            className="bg-white/10! hover:bg-white/20! border! border-white/20! text-white! 
                       shadow-[0_0_20px_rgba(255,255,255,0.25)]! rounded-xl! px-4! py-2! text-sm! 
                       transition-transform hover:scale-[1.03] active:scale-[0.97]"
          />
        </div>
      </div>
    </nav>
  )
}
