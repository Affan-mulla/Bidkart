import { Link } from "react-router-dom";

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

  return (
    <Link to={`/product/${product._id}`}>
      <Card className="h-full py-0">
        <img
          src={imageUrl}
          alt={product.title}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
        <CardContent className="space-y-2 py-3">
          <p className="text-sm font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
            {product.title}
          </p>

          <p className="text-xs text-muted-foreground">⭐ {Number(product.ratings || 0).toFixed(1)}</p>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{formatPrice(product.basePrice || 0)}</p>
            {product.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
