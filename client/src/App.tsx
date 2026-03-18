import AuthInitializer from "@/components/AuthInitializer"
import { Toaster as Sonner } from "sonner"
import AppRoutes from "./routes"

const App = () => {
  return (
    <>
      <AuthInitializer />
      <AppRoutes/>
      <Sonner richColors position="top-right" />
    </>
  )
}

export default App
