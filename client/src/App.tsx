import AuthInitializer from "@/components/AuthInitializer"
import { Toaster  } from "sonner"
import AppRoutes from "./routes"

const App = () => {
  return (
    <>
      <AuthInitializer />
      <AppRoutes/>
      <Toaster richColors  position="bottom-right" />
    </>
  )
}

export default App
