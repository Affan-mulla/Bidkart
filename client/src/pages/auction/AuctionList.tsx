import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { AuctionIcon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { getAuctions, type GetAuctionsParams } from "@/api/auction.api"
import AuctionCard from "@/components/auction/AuctionCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type StatusTab = "all" | "live" | "scheduled" | "ended"

/**
 * Renders all active and upcoming auctions.
 */
export default function AuctionList() {
  const [status, setStatus] = useState<StatusTab>("all")
  const [sort, setSort] = useState<GetAuctionsParams["sort"]>("ending_soon")
  const [page, setPage] = useState(1)

  const queryResult = useQuery({
    queryKey: ["auctions", status, sort, page],
    queryFn: () =>
      getAuctions({
        status: status === "all" || status === "ended" ? undefined : status,
        sort,
        page,
        limit: 9,
      }),
  })

  const auctions = (queryResult.data?.auctions ?? []).filter((auction) => {
    if (status === "ended") {
      return auction.status === "ended" || auction.status === "sold"
    }

    return true
  })

  const totalPages = queryResult.data?.totalPages || 1

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Auctions</h1>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "live", label: "Live Now" },
            { key: "scheduled", label: "Upcoming" },
            { key: "ended", label: "Ended" },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={status === tab.key ? "default" : "outline"}
              onClick={() => {
                setStatus(tab.key as StatusTab)
                setPage(1)
              }}
            >
              {tab.label}
            </Button>
          ))}

          <div className="ml-auto">
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as GetAuctionsParams["sort"])
                setPage(1)
              }}
            >
              <SelectTrigger className="min-w-[180px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="most_bids">Most Bids</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {queryResult.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : null}

      {queryResult.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      ) : null}

      {!queryResult.isLoading && !queryResult.isError && auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-20 text-center">
          <HugeiconsIcon icon={AuctionIcon} className="size-8 text-muted-foreground" />
          <p className="mt-3 text-base font-medium text-foreground">No auctions found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try changing filters or sorting.</p>
        </div>
      ) : null}

      {!queryResult.isLoading && !queryResult.isError && auctions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((previousPage) => Math.max(1, previousPage - 1))}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Previous
            </Button>

            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>

            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((previousPage) => Math.min(totalPages, previousPage + 1))}
            >
              Next
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          </div>
        </>
      ) : null}
    </section>
  )
}