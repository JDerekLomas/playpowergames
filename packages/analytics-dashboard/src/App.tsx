import GameSessionTable from "./components/game_session"

function App() {
  return (
    <div className="flex min-h-screen w-full">
      <main className="container w-full mx-auto flex flex-col items-center justify-start pt-4">
        <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
        <GameSessionTable />
      </main>
    </div>
  )
}

export default App