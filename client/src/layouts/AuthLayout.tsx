import { AuctionIcon, RotateClockwiseIcon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "framer-motion"
import { Outlet } from "react-router-dom"

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#f6f3f2] md:grid md:grid-cols-2">
      <aside className="relative hidden overflow-hidden  p-10 text-white md:flex md:flex-col md:justify-between">
       <img src="/1.jpg" alt="" className=" absolute inset-0 object-cover brightness-75" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <HugeiconsIcon icon={ShoppingBag01Icon} className="size-6" />
          </div>
          <div>
            <p className="text-xl font-semibold tracking-wide">BidKart</p>
            <p className="text-sm text-white/80">Shop. Bid. Win.</p>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <h1 className="max-w-sm font-serif text-4xl leading-tight">Discover deals and live auctions in one seamless marketplace.</h1>
          <div className="flex flex-wrap gap-3 text-sm text-white/90">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <HugeiconsIcon icon={AuctionIcon} className="size-4" />
              Real-time bidding
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <HugeiconsIcon icon={RotateClockwiseIcon} className="size-4" />
              Secure checkout
            </span>
          </div>
        </div>
      </aside>

      <section className="flex max-h-screen items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-lg sm:p-8"
        >
          <Outlet />
        </motion.div>
      </section>
    </div>
  )
}
