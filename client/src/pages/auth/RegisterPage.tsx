import BuyerRegisterForm from "@/components/auth/BuyerRegisterForm"

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Create your buyer account</h2>
        <p className="text-sm text-muted-foreground">Start shopping and bidding in minutes.</p>
      </div>
      <BuyerRegisterForm />
    </div>  
  )
}
