import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicProfile } from "@/schema/profileSchema";

export function ProfileAvatar({ profile }: { profile: PublicProfile }) {
  return (
    <Avatar role="img" aria-label={`${profile.fullName}'s avatar`} className="size-16 shrink-0 sm:size-20">
      <AvatarImage src={profile.avatar || undefined} alt={profile.fullName} />
      <AvatarFallback className="bg-main-soft font-heading text-xl font-semibold text-main sm:text-2xl">
        {profile.fullName.trim().slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
