import { useParams } from "react-router-dom"

/**
 * Renders details for a single product.
 */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Product Detail</h1>
      <p className="mt-2 text-sm text-muted-foreground">Product id: {id}</p>
    </section>
  )
}