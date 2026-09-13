import { cn } from "@/lib/utils";
import { CaretRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

// `items`: [{ label, to? }] — item terakhir (tanpa `to`) dianggap halaman
// aktif (gak jadi link, ditonjolin warnanya).
export function Breadcrumb({ items, className }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <CaretRight className="size-3 shrink-0" />}
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-foreground hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
