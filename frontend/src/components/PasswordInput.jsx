import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useState } from "react";

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-8", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeSlash size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}
