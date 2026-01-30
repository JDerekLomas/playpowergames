import type { ColumnDef } from "@tanstack/react-table"

export type Trial = {
  sessionId: string
  createdAt: number
  questionText: string
  questionMechanic: string
  achievedPoints: number
  questionMaxPoints: number
  isCorrect: boolean
  userId: string
  currentStreak?: number
  optionsDisplay?: Array<{ option: string; isCorrect: boolean }>
  studentResponse?: string
  studentResponseAccuracyPercentage?: string
}

export const columns: ColumnDef<Trial>[] = [
  { accessorKey: "sessionId", header: "Session ID" },
  { accessorKey: "createdAt", header: "Time" },
  { accessorKey: "questionText", header: "Question" },
  { accessorKey: "questionMechanic", header: "Mechanic" },
  { accessorKey: "achievedPoints", header: "Points" },
  { accessorKey: "questionMaxPoints", header: "Max" },
  { accessorKey: "isCorrect", header: "Correct" },
  { accessorKey: "currentStreak", header: "Streak" },
  { accessorKey: "studentResponse", header: "Response" },
  { accessorKey: "studentResponseAccuracyPercentage", header: "Accuracy" },
]


