interface UserAvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ src, alt, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }[size];

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClasses} rounded-full object-cover aspect-square border-2 border-zinc-800`}
    />
  );
}