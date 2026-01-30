import type { ColumnDef } from "@tanstack/react-table"
 
// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type GameSession = {
  id: string;
  gameName: string;
  sessionStartTime: number;
  ipAddress: string;
  sessionId: string;
  deviceType: string;
  topic: string;
  userId: string;
  parentSessionId: string;
  sessionStatus: "OPEN" | "CLOSED";
  deviceInfo: string;
}
 
export const columns: ColumnDef<GameSession>[] = [
  {
    accessorKey: "sessionId",
    header: "Session ID",
    cell: ({ row }) => {
      const sessionId = row.getValue<string>("sessionId")
      const href = `?sessionId=${encodeURIComponent(sessionId)}`
      return <a href={href} className="text-blue-600 hover:underline">{sessionId}</a>
    }
  },
  {
    accessorKey: "parentSessionId",
    header: "Parent Session ID",
  },
  {
    accessorKey: "sessionStatus",
    header: "Status",
  },
  {
    accessorKey: "gameName",
    header: "Game Name",
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
  },
  {
    accessorKey: "topic",
    header: "Topic",
  },
  {
    accessorKey: "deviceType",
    header: "Device Type",
  }
]