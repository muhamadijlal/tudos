import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Tumpukan avatar buat task yang assignee-nya lebih dari satu — nampilin
// sampai `max` avatar bertumpuk (pakai AvatarGroup bawaan), sisanya
// diringkas jadi badge "+N".
export function AssigneeAvatarGroup({ assignees = [], size = "sm", max = 3, className }) {
  if (assignees.length === 0) {
    return <AssigneeAvatar size={size} className={className} />;
  }

  const visible = assignees.slice(0, max);
  const remaining = assignees.length - visible.length;
  const isXs = size === "xs";

  return (
    <AvatarGroup className={className} data-size={size}>
      {visible.map((assignee) => (
        // bg-background: warna fallback avatar sengaja tipis/transparan (buat
        // konteks satu avatar biasa) — begitu ditumpuk, itu bikin avatar yang
        // di belakang keliatan nembus. Kasih backing solid biar avatar yang di
        // depan beneran nutup avatar di belakangnya, bukan malah kebayang.
        <AssigneeAvatar
          key={assignee.id}
          id={assignee.id}
          name={assignee.name}
          pictureUrl={assignee.profilePictureUrl}
          size={size}
          className="bg-background"
        />
      ))}
      {remaining > 0 && (
        <AvatarGroupCount
          className={cn(isXs && "size-5 text-[9px]")}
          title={assignees
            .slice(max)
            .map((a) => a.name)
            .join(", ")}
        >
          +{remaining}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}
