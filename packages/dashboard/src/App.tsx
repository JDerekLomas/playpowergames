import Dashboard from "@components/Dashboard";
import { LanguageProvider } from "@/contexts/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <Dashboard />
    </LanguageProvider>
  );
}

export default App;