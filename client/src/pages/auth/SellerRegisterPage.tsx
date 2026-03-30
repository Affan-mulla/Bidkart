
import SellerRegisterForm from "@/components/auth/SellerRegisterForm"
import { ShoppingBagIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export default function SellerRegisterPage() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/20">
      <div className="w-full flex flex-col gap-4 p-2 lg:flex-row lg:gap-8">
        {/* Left Dark Panel */}
        <div className="relative hidden w-full flex-col justify-between overflow-hidden rounded bg-secondary p-5 text-white lg:flex lg:w-1/2">
          <img
            src="/2.jpg"
            alt="Auth visual"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.5] grayscale-[0.3]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-medium">
              <HugeiconsIcon icon={ShoppingBagIcon} size={24} />
              BidKart
            </div>
            <div className="flex gap-6 text-sm font-medium opacity-90">
              <span>Shop</span>
              <span>Auctions</span>
              <span>Sellers</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto flex flex-col gap-6">
            <div className="flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 p-1.5 pr-4 backdrop-blur-md">
              <div className="flex -space-x-2">
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=5" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=6" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=7" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=8" alt="Avatar" />
              </div>
              <span className="text-sm font-medium">Trusted by top vendors</span>
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Join the Ultimate
                <br />
                Bidding Platform
              </h1>
              <p className="max-w-md text-lg text-white/80">
                Create an account to start participating in live auctions, unlocking member-only deals, and selling
                your products.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex w-full flex-col justify-center px-6 py-2 sm:px-12 md:px-16 lg:w-1/2 lg:px-12">
          <div className="mb-8 flex items-center gap-2 font-medium lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HugeiconsIcon icon={ShoppingBagIcon} />
            </span>
            <span className="text-xl">BidKart</span>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col rounded-2xl border border-border/60 bg-background/95 px-6 py-13 shadow-sm backdrop-blur-sm">
            <div className="mb-8">
              <div className="mb-6 hidden size-10 items-center justify-center rounded-lg bg-primary/10 text-primary lg:flex">
                <HugeiconsIcon icon={ShoppingBagIcon} size={24} />
              </div>
              <h2 className="mb-2 text-3xl font-bold tracking-tight">Create Seller Account</h2>
              <p className="text-sm text-muted-foreground">Enter your details to get started as a seller on BidKart</p>
            </div>

            <SellerRegisterForm />
          </div>
        </div>
      </div>
    </div>
  )
}
