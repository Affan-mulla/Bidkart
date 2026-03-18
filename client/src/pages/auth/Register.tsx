import BuyerRegisterForm from "@/components/auth/BuyerRegisterForm"
import { ShoppingBagIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const Register = () => {
  return (
    <div className="min-h-svh flex items-center justify-center bg-muted/20">
      <div className="w-full flex flex-col gap-4 p-2 lg:flex-row lg:gap-8">
        {/* Left Dark Panel */}
        <div className="relative hidden w-full lg:flex lg:w-1/2 flex-col justify-between overflow-hidden rounded bg-secondary p-5 text-white">
          <img
            src="/2.jpg"
            alt="Auth visual"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.5] grayscale-[0.3]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-lg">
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
            <div className="flex items-center gap-3 rounded-full bg-white/10 p-1.5 pr-4 backdrop-blur-md w-fit border border-white/20">
              <div className="flex -space-x-2">
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=5" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=6" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=7" alt="Avatar" />
                <img className="size-8 rounded-full border-2 border-black" src="https://i.pravatar.cc/100?img=8" alt="Avatar" />
              </div>
              <span className="text-sm font-medium">Trusted by top vendors</span>
            </div>
            
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                Join the Ultimate<br />Bidding Platform
              </h1>
              <p className="text-lg text-white/80 max-w-md">
                Create an account to start participating in live auctions, unlocking member-only deals, and selling your products.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-2 sm:px-12 md:px-16 lg:px-12">
          <div className="flex items-center gap-2 font-medium lg:hidden mb-8">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HugeiconsIcon icon={ShoppingBagIcon} />
            </span>
            <span className="text-xl">BidKart</span>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col rounded-2xl border border-border/60 bg-background/95 p-4 shadow-sm backdrop-blur-sm">
            <div className="mb-8">
              <div className="hidden lg:flex size-10 items-center justify-center mb-6 rounded-lg bg-primary/10 text-primary">
                 <HugeiconsIcon icon={ShoppingBagIcon} size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Create an Account</h2>
              <p className="text-muted-foreground text-sm">Enter your details to get started with BidKart</p>
            </div>

            <BuyerRegisterForm />

            <div className="mt-2 border-t border-border/70 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Secure Payments By</p>
              <div className="flex items-center gap-6 opacity-60 grayscale dark:opacity-40">
                <span className="font-bold text-lg">Razorpay</span>
                <span className="font-bold text-lg italic">VISA</span>
                <span className="font-bold text-lg tracking-tighter">MasterCard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
