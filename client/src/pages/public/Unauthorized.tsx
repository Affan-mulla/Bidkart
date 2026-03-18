import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export default function Unauthorized() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold text-foreground">Unauthorized</h1>
      <p className="text-sm text-muted-foreground">You do not have permission to access this page.</p>
      <Button asChild className="bg-[#9b2c2c] text-white hover:bg-[#7f2323]">
        <Link to="/">Go home</Link>
      </Button>
    </section>
  )
}
