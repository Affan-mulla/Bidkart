import { ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "react-router-dom";

const Logo = () => {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 font-medium text-lg shrink-0"
    >
      <HugeiconsIcon icon={ShoppingBag01Icon} className="text-primary" />
      <p>
        Bid<span className="font-bold text-primary">Kart</span>
      </p>
    </Link>
  );
};

export default Logo;
