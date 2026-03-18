import { useParams } from "react-router-dom"

/**
 * Renders details and bid panel for a single auction.
 */
export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Auction Detail</h1>
      <p className="mt-2 text-sm text-muted-foreground">Auction id: {id}</p>
    </section>
  )
}