'use client'

import { MessageCircle } from 'lucide-react'

interface Props {
  phone: string | null | undefined
  className?: string
}

/**
 * Renders a WhatsApp icon link to wa.me/<digits>.
 * Returns null when phone is missing — caller's cell stays empty.
 */
export function MedicalWhatsAppLink({ phone, className }: Props) {
  if (!phone) return null

  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`WhatsApp (${phone})`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      <MessageCircle className="h-4 w-4 text-green-600 hover:text-green-700 transition-colors" />
    </a>
  )
}
