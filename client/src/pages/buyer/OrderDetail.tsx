import { useParams } from "react-router-dom"

/**
 * Renders details for a specific buyer order.
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Order Detail</h1>
      <p className="mt-2 text-sm text-muted-foreground">Order id: {id}</p>
    </section>
  )
}