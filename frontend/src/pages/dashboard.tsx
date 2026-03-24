import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Users,
  Target,
  Coins,
  ChevronRight,
  Wallet,
  Sparkles,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/hooks/use-wallet"
import { formatTokens } from "@/lib/utils"
import { questClient } from "@/lib/contracts/quest"
import type { QuestInfo } from "@/lib/contracts/quest"
import { milestoneClient } from "@/lib/contracts/milestone"
import { rewardsClient } from "@/lib/contracts/rewards"

interface DashboardProps {
  onSelectWorkspace: (id: number) => void
}

interface QuestWithStats extends QuestInfo {
  enrolleeCount: number
  milestoneCount: number
  poolBalance: bigint
  completedCount: number
  isOwned: boolean
}

export function Dashboard({ onSelectWorkspace }: DashboardProps) {
  const { connected, connect, shortAddress, address } = useWallet()
  const [filter, setFilter] = useState<"all" | "owned" | "enrolled">("all")
  const [quests, setQuests] = useState<QuestWithStats[]>([])
  const [totalEarnings, setTotalEarnings] = useState<bigint>(0n)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuests = useCallback(async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch total user earnings in a single call (Maintainer feedback)
      const earnings = await rewardsClient.getUserEarnings(address)
      setTotalEarnings(earnings)

      // 2. Fetch all quests 
      const allQuests = await questClient.getQuests()
      
      // 3. Parallelize fetching of stats for relevant quests to solve N+1 Problem (Maintainer feedback)
      const questStatsPromises = allQuests.map(async (q) => {
        const isOwned = q.owner === address
        const isEnrolled = await questClient.isEnrollee(q.id, address)
        
        if (!isOwned && !isEnrolled) return null

        const [enrollees, milestoneCount, poolBalance, completedCount] = await Promise.all([
          questClient.getEnrollees(q.id),
          milestoneClient.getMilestoneCount(q.id),
          rewardsClient.getPoolBalance(q.id),
          milestoneClient.getEnrolleeCompletions(q.id, address),
        ])

        return {
          ...q,
          enrolleeCount: enrollees.length,
          milestoneCount,
          poolBalance,
          completedCount,
          isOwned,
        } as QuestWithStats
      })

      const results = await Promise.all(questStatsPromises)
      setQuests(results.filter((q): q is QuestWithStats => q !== null))
    } catch (err: unknown) {
      console.error("Failed to fetch dashboard data:", err)
      setError("Failed to load dashboard data from the network.")
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (connected && address) {
      fetchQuests()
    }
  }, [connected, address, fetchQuests])

  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-67px)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots pointer-events-none" />
        <div className="relative px-4 max-w-lg mx-auto">
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden animate-scale-in">
            <div className="bg-primary border-b-[3px] border-black px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Dashboard</span>
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
                Connect your Freighter wallet to view your quests, track your progress, and start earning USDC.
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

  const filteredQuests = quests.filter((q) => {
    if (filter === "owned") return q.isOwned
    if (filter === "enrolled") return !q.isOwned
    return true
  })

  return (
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="relative bg-primary border-[3px] border-black shadow-[6px_6px_0_#000] p-6 sm:p-8 mb-8 overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none opacity-30" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Welcome back</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black">
              {shortAddress}
            </h1>
            <div className="flex items-center gap-4 mt-2">
               <p className="text-xs font-bold opacity-70">
                 {quests.length} active quests
               </p>
               <div className="h-4 w-px bg-black/20" />
               <p className="text-sm font-black text-green-800">
                 {formatTokens(Number(totalEarnings))} USDC earned
               </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="shimmer-on-hover group flex-shrink-0"
            onClick={() => {}}
          >
            <Plus className="h-4 w-4" />
            New Quest
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 relative">
        <h2 className="text-xl font-black">Your Quests</h2>
        <div className="flex gap-0 border-[2px] border-black shadow-[3px_3px_0_#000]">
          {(["all", "owned", "enrolled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors capitalize cursor-pointer border-r-[2px] border-black last:border-r-0 ${
                filter === f ? "bg-primary" : "bg-white hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Optimizing network queries...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5 animate-shake">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h3 className="font-black text-lg mb-2">Network Error</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchQuests} variant="outline" className="border-black">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 relative">
          {filteredQuests.map((q, i) => (
            <Card
              key={q.id}
              className={`card-tilt cursor-pointer group animate-fade-in-up stagger-${i + 1} border-black border-2`}
              onClick={() => onSelectWorkspace(q.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {q.name}
                      </CardTitle>
                      {q.completedCount === q.milestoneCount && q.milestoneCount > 0 && (
                        <Badge variant="success" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Complete
                        </Badge>
                      )}
                      <Badge variant={q.isOwned ? "default" : "secondary"} className="text-[10px]">
                        {q.isOwned ? "Owner" : "Enrolled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {q.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-secondary border-[2px] border-black flex items-center justify-center flex-shrink-0 ml-3 group-hover:bg-primary group-hover:shadow-[2px_2px_0_#000] transition-all">
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                  <Badge variant="secondary" className="gap-1 border-black border">
                    <Users className="h-3 w-3" />
                    {q.enrolleeCount} enrolled
                  </Badge>
                  <Badge variant="secondary" className="gap-1 border-black border">
                    <Target className="h-3 w-3" />
                    {q.milestoneCount} milestones
                  </Badge>
                  <Badge variant="default" className="gap-1 border-black border">
                    <Coins className="h-3 w-3" />
                    {formatTokens(Number(q.poolBalance))} USDC Pooled
                  </Badge>
                </div>

                {q.milestoneCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Progress value={q.completedCount} max={q.milestoneCount} className="flex-1" />
                      <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {q.completedCount}/{q.milestoneCount} Done
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredQuests.length === 0 && (
            <Card className="animate-fade-in-up border-black border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-primary border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center mb-6">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-black text-lg mb-2">
                  {filter === "all" ? "No quests yet" : `No ${filter} quests`}
                </h3>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
