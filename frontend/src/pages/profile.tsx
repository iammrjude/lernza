import { Wallet, Coins, TrendingUp, Sparkles, Copy, Check, Loader2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/hooks/use-wallet"
import { formatTokens } from "@/lib/utils"
import { questClient } from "@/lib/contracts/quest"
import { rewardsClient } from "@/lib/contracts/rewards"

/* ─── Generated Avatar from wallet address ─── */

function WalletAvatar({ address }: { address: string }) {
  // Generate a grid of colored blocks from the address
  const colors = ["#FACC15", "#22C55E", "#000000", "#F5F5F4", "#FFFFFF"]
  const cells = Array.from({ length: 16 }, (_, i) => {
    const charCode = address.charCodeAt(i % address.length) || 0
    return colors[charCode % colors.length]
  })

  return (
    <div className="w-20 h-20 border-[3px] border-black shadow-[4px_4px_0_#000] grid grid-cols-4 overflow-hidden flex-shrink-0">
      {cells.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  )
}

export function Profile() {
  const { connected, connect, address } = useWallet()
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalEarned, setTotalEarned] = useState<bigint>(0n)
  const [enrolledQuestsCount, setEnrolledQuestsCount] = useState(0)

  const fetchStats = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      // Parallelize fetching of stats (Maintainer feedback)
      const [allQuests, earnings] = await Promise.all([
        questClient.getQuests(),
        rewardsClient.getUserEarnings(address)
      ])

      setTotalEarned(earnings)

      // Filter enrolled quests
      const enrolledCheckPromises = allQuests.map(async (q) => {
        const isEnrolled = await questClient.isEnrollee(q.id, address)
        return isEnrolled ? 1 : 0
      })
      
      const counts = await Promise.all(enrolledCheckPromises)
      setEnrolledQuestsCount(counts.filter(c => c === 1).length)
    } catch (err: unknown) {
      console.error("Failed to fetch profile stats:", err)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (connected && address) {
      fetchStats()
    }
  }, [connected, address, fetchStats])

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />
        <div className="relative px-4 max-w-lg mx-auto">
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden animate-scale-in">
            <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Profile</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-destructive border border-black" />
                <span className="text-xs font-bold">Not Connected</span>
              </div>
            </div>
            <div className="p-8 sm:p-10 text-center">
              <div className="w-20 h-20 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-6 mx-auto animate-fade-in-up">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-3 animate-fade-in-up stagger-1">
                Connect your wallet
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto animate-fade-in-up stagger-2">
                Connect your Freighter wallet to view your profile and track earnings.
              </p>
              <Button size="lg" onClick={connect} className="shimmer-on-hover animate-fade-in-up stagger-3">
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="absolute inset-0 bg-grid-dots pointer-events-none opacity-30" />

      <div className="relative mb-8 animate-fade-in-up">
        <div className="bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] overflow-hidden">
          <div className="absolute inset-0 bg-diagonal-lines opacity-20 pointer-events-none" />
          <div className="h-20 sm:h-28 relative" />
          <div className="bg-white border-t-[3px] border-black px-6 py-5 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 -mt-14 sm:-mt-16">
              <WalletAvatar address={address || ""} />
              <div className="flex-1 min-w-0 mt-2 sm:mt-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black">Learner</h2>
                  <Badge variant="success" className="gap-1 border-black border">
                    <Sparkles className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm text-muted-foreground font-bold truncate max-w-[200px] sm:max-w-xs">
                    {address}
                  </p>
                  <button onClick={handleCopy} className="w-7 h-7 border-[2px] border-black bg-white shadow-[2px_2px_0_#000] flex items-center justify-center neo-press hover:bg-secondary flex-shrink-0 cursor-pointer">
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="sm:mt-6">
                <div className="bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-2xl font-black tabular-nums">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatTokens(Number(totalEarned))}
                    </p>
                  </div>
                  <p className="text-xs font-bold">Total USDC Earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="neo-lift border-black border-2">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Enrolled Quests</p>
              <p className="text-2xl font-black">{enrolledQuestsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="neo-lift border-black border-2">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-success border-[2px] border-black shadow-[3px_3px_0_#000] flex items-center justify-center text-white">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Network Status</p>
              <p className="text-xl font-black">Testnet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
