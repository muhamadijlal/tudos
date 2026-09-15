import { cn } from "@/lib/utils";
import { CaretRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

// `items`: [{ label, to? }] — item terakhir (tanpa `to`) dianggap halaman
// aktif (gak jadi link, ditonjolin warnanya).
export function Breadcrumb({ items, className }) {
  return (
    <nav
      className={cn(
        "flex min-w-0 flex-nowrap items-center gap-1.5 mt-0.5 overflow-hidden text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span
            key={index}
            className={cn(
              "flex items-center gap-1.5",
              isLast ? "min-w-0" : "shrink-0",
            )}
          >
            {index > 0 && <CaretRight className="size-3 shrink-0" />}
            {item.to ? (
              <Link
                to={item.to}
                className="truncate hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-foreground">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
