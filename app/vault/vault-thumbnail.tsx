"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";

const SIZE_CLASS = {
  sm: "size-10 rounded-md p-1",
  md: "size-16 rounded-lg p-1.5",
  lg: "size-20 rounded-lg p-1.5",
} as const;

type VaultThumbnailProps = {
  imageUrl?: string | null;
  title: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  onPlaceholderClick?: () => void;
};

export function VaultThumbnail({
  imageUrl,
  title,
  size = "md",
  className = "",
  onPlaceholderClick,
}: VaultThumbnailProps) {
  const boxClass = [
    "shrink-0 overflow-hidden border border-zinc-200 bg-zinc-50",
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const src = imageUrl?.trim();
  if (src) {
    return (
      <div className={boxClass} aria-hidden>
        <Image
          src={src}
          alt=""
          width={80}
          height={80}
          unoptimized
          loading="lazy"
          className="size-full object-contain"
        />
      </div>
    );
  }

  const placeholder = (
    <>
      <ImageIcon className="size-4 text-zinc-400 sm:size-5" aria-hidden />
      {onPlaceholderClick ? (
        <span className="sr-only">Add thumbnail for {title}</span>
      ) : null}
    </>
  );

  if (onPlaceholderClick) {
    return (
      <button
        type="button"
        onClick={onPlaceholderClick}
        className={`${boxClass} flex items-center justify-center text-zinc-400 transition hover:border-zinc-300 hover:bg-white`}
        aria-label={`Add thumbnail for ${title}`}
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div
      className={`${boxClass} flex items-center justify-center text-zinc-400`}
      aria-hidden
    >
      {placeholder}
    </div>
  );
}