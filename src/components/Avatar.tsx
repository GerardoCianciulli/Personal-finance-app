import { assetUrl, initials } from '../utils/format'
import './Avatar.css'

interface AvatarProps {
  name: string
  src: string
  size?: 'sm' | 'md'
}

/** Profile picture of a recipient/sender or biller, with initials when no picture exists */
export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const className = `avatar avatar--${size}`
  if (src) return <img className={className} src={assetUrl(src)} alt="" width={40} height={40} loading="lazy" />
  return (
    <span className={`${className} avatar--initials`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
