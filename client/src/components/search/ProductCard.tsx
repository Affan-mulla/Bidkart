import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchProduct } from "@/api/product.api";

interface ProductCardProps {
  product: SearchProduct;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images?.[0] || "https://placehold.co/600x400?text=No+Image";
  const rating = Number(product.ratings || 0).toFixed(1);

  return (
    <Link to={`/product/${product._id}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/80 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <img
          src={imageUrl}
          alt={product.title}
          className="h-40 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <CardContent className="space-y-2 p-3">
          <p className="text-sm font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
            {product.title}
          </p>

          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={StarIcon} className="size-3.5 text-primary" />
            <span>{rating}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{formatPrice(product.basePrice || 0)}</p>
            {product.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
