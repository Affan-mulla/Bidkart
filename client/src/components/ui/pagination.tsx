import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({
  className,
  isActive,
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean }) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({ variant: isActive ? "default" : "outline", size: "icon-sm" }),
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size={undefined}
      className={cn("gap-1.5 px-2 has-[>svg]:px-2", className)}
      {...props}
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
      <span>{children ?? "Previous"}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size={undefined}
      className={cn("gap-1.5 px-2 has-[>svg]:px-2", className)}
      {...props}
    >
      <span>{children ?? "Next"}</span>
      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex h-7 w-7 items-center justify-center", className)}
      {...props}
    >
      <HugeiconsIcon icon={MoreHorizontalCircle01Icon} className="size-4 text-muted-foreground" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
};
