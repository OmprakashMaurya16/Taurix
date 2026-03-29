import Dashboard from "./pages/Dashboard"
import Portfolio from "./pages/Portfolio"
import Insights from "./pages/Insights"
import { Routes, Route } from "react-router-dom"

function App() {

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/insights" element={<Insights />} />
    </Routes>
  )
}

export default App
