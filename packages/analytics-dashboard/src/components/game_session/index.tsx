import { useEffect, useState } from "react"
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { columns, type GameSession } from "./columns"
import { DataTable } from "../data-table"
import { getQueryAPI } from "@/config"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Filter } from "lucide-react"


export default function GameSessionTable() {
  const [data, setData] = useState<GameSession[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [pageToken, setPageToken] = useState<string | null>(null) // token used for the current request
  const [nextToken, setNextToken] = useState<string | null>(null) // token received from the API for the next page
  const [prevTokens, setPrevTokens] = useState<string[]>([]) // history of page tokens for Prev
  const [parentSessionId, setParentSessionId] = useState<string>("")
  const [gameName, setGameName] = useState<string>("")
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [fromTime, setFromTime] = useState<string>("00:00")
  const [toTime, setToTime] = useState<string>("23:59")
  const [status, setStatus] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const sessionStartTime = combineDateTime(fromDate, fromTime)
        const end = combineDateTime(toDate, toTime)
        const res = await fetch(getQueryAPI("sessionData", 20, "asc", pageToken || undefined, {
          parentSessionId: parentSessionId || undefined,
          gameId: gameName || undefined,
          startTime: sessionStartTime,
          endTime: end,
          sessionStatus: status || undefined,
        }))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const items = Array.isArray(json?.items) ? json.items : []
        const mapped: GameSession[] = items.map((it: any) => ({
          id: String(it.sessionId ?? it.parentSessionId ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          gameName: String(it.gameName ?? ""),
          sessionStartTime: Number(it.sessionStartTime ?? 0),
          ipAddress: String(it.ipAddress ?? ""),
          sessionId: String(it.sessionId ?? ""),
          deviceType: String(it.deviceType ?? ""),
          topic: String(it.topic ?? it.gameLevelInfo ?? ""),
          userId: String(it.userId ?? ""),
          parentSessionId: String(it.parentSessionId ?? ""),
          sessionStatus: (it.sessionStatus === "CLOSED" ? "CLOSED" : "OPEN"),
          deviceInfo: String(it.deviceInfo ?? ""),
        }))
        if (!cancelled) {
          setData(mapped)
          setNextToken(json?.nextToken ?? null)
        }
      } catch (e) {
        if (!cancelled) {
          setData([])
          setNextToken(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [pageToken, parentSessionId, gameName, fromDate, toDate, fromTime, toTime, status])

  const canPrev = prevTokens.length > 0
  const canNext = !!nextToken

  function goNext() {
    if (!canNext) return
    setPrevTokens((p) => [...p, pageToken ?? ""]) // store current token ("" means first page)
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
      <DataTable
        columns={columns}
        data={data}
        headerFilters={{
          parentSessionId: (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3.5 w-3.5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Filter by parentSessionId</div>
                  <input value={parentSessionId} onChange={(e) => { setPrevTokens([]); setPageToken(null); setParentSessionId(e.target.value) }} className="border rounded px-3 py-1 w-full" placeholder="parentSessionId" />
                </div>
              </PopoverContent>
            </Popover>
          ),
          gameName: (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3.5 w-3.5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Filter by gameName</div>
                  <input value={gameName} onChange={(e) => { setPrevTokens([]); setPageToken(null); setGameName(e.target.value) }} className="border rounded px-3 py-1 w-full" placeholder="gameName" />
                </div>
              </PopoverContent>
            </Popover>
          ),
          sessionStatus: (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3.5 w-3.5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Session status</div>
                  <select value={status} onChange={(e) => { setPrevTokens([]); setPageToken(null); setStatus(e.target.value) }} className="border rounded px-3 py-1 w-full">
                    <option value="">All</option>
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </PopoverContent>
            </Popover>
          ),
          sessionStartTime: (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Filter className="h-3.5 w-3.5" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px]">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Time range</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">From</div>
          <Calendar mode="single" selected={fromDate} onSelect={(d) => { setPrevTokens([]); setPageToken(null); setFromDate(d ?? undefined) }} />
          <Input type="time" value={fromTime} onChange={(e) => { setPrevTokens([]); setPageToken(null); setFromTime(e.target.value) }} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">To</div>
          <Calendar mode="single" selected={toDate} onSelect={(d) => { setPrevTokens([]); setPageToken(null); setToDate(d ?? undefined) }} />
          <Input type="time" value={toTime} onChange={(e) => { setPrevTokens([]); setPageToken(null); setToTime(e.target.value) }} />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ),
        }}
      />

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

function combineDateTime(date?: Date, time?: string): number | undefined {
  if (!date) return undefined
  const [hh = '00', mm = '00'] = (time || '').split(':')
  const d = new Date(date)
  d.setHours(Number(hh || 0), Number(mm || 0), 0, 0)
  const ms = d.getTime()
  return isNaN(ms) ? undefined : ms
}