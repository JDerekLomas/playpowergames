import { useEffect, useState } from "react"
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { DataTable } from "../data-table"
import { columns, type Trial } from "./columns"
import { getQueryAPI } from "@/config"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Filter } from "lucide-react"

export default function TrialsTable() {
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get('sessionId') || params.get('sessionid') || ''
  const [data, setData] = useState<Trial[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [pageToken, setPageToken] = useState<string | null>(null)
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [prevTokens, setPrevTokens] = useState<string[]>([])
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)

  const canPrev = prevTokens.length > 0
  const canNext = !!nextToken

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const createdAt = startOfDayMs(fromDate)
        const createdAtEnd = endOfDayMs(toDate)
        const url = getQueryAPI('trialsData', 50, 'asc', pageToken || undefined, { sessionId, createdAt, createdAtEnd })
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const items = Array.isArray(json?.items) ? json.items : []
        const mapped: Trial[] = items.map((it: any) => ({
          sessionId: String(it.sessionId ?? ''),
          createdAt: Number(it.createdAt ?? 0),
          questionText: String(it.questionText ?? ''),
          questionMechanic: String(it.questionMechanic ?? ''),
          achievedPoints: Number(it.achievedPoints ?? 0),
          questionMaxPoints: Number(it.questionMaxPoints ?? 0),
          isCorrect: Boolean(it.isCorrect ?? false),
          userId: String(it.userId ?? ''),
          currentStreak: it.currentStreak != null ? Number(it.currentStreak) : undefined,
          optionsDisplay: it.optionsDisplay,
          studentResponse: it.studentResponse,
          studentResponseAccuracyPercentage: it.studentResponseAccuracyPercentage,
        }))
        if (!cancelled) {
          setData(mapped)
          setNextToken(json?.nextToken ?? null)
        }
      } catch (e) {
        if (!cancelled) { setData([]); setNextToken(null) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [sessionId, pageToken, fromDate, toDate])

  function goNext() {
    if (!canNext) return
    setPrevTokens((p) => [...p, pageToken ?? ""])
    setPageToken(nextToken)
  }

  function goPrev() {
    if (!canPrev) return
    const tokens = [...prevTokens]
    const last = tokens.pop() || null
    setPrevTokens(tokens)
    setPageToken(last || null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-3"><a href="/analytics-dashboard/">← Back to sessions</a></div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3.5 w-3.5 mr-2" /> Time range
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[560px]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">From</div>
                  <Calendar mode="single" selected={fromDate} onSelect={(d) => { setPrevTokens([]); setPageToken(null); setFromDate(d ?? undefined) }} />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">To</div>
                  <Calendar mode="single" selected={toDate} onSelect={(d) => { setPrevTokens([]); setPageToken(null); setToDate(d ?? undefined) }} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <DataTable columns={columns} data={data} />
      <div className="mt-4 flex justify-end gap-2">
        <button className="border rounded p-2 disabled:opacity-50" onClick={goPrev} disabled={!canPrev} aria-label="Previous page">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button className="border rounded p-2 disabled:opacity-50" onClick={goNext} disabled={!canNext} aria-label="Next page">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function startOfDayMs(date?: Date): number | undefined {
  if (!date) return undefined
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const ms = d.getTime()
  return isNaN(ms) ? undefined : ms
}

function endOfDayMs(date?: Date): number | undefined {
  if (!date) return undefined
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  const ms = d.getTime()
  return isNaN(ms) ? undefined : ms
}


