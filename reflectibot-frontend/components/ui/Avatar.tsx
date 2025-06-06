// src/components/ui/avatar.tsx
import * as React from "react"

export function Avatar({ src, alt }: { src: string; alt?: string }) {
  return (
    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
      {src ? <img src={src} alt={alt || "Avatar"} className="h-full w-full object-cover" /> : null}
    </div>
  );
}

export function AvatarImage({ src, alt }: { src: string; alt?: string }) {
  return <img src={src} alt={alt || "Avatar Image"} className="h-full w-full object-cover" />;
}
