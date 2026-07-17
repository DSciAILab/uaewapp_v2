'use client';

import { MessageCircle } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

interface WalkoutWhatsAppLinkProps {
  phone: string | null | undefined;
  fighterName: string;
  /** Full event name, e.g. "UAE Warriors 72" — the number is taken from it. */
  eventName: string | null | undefined;
  className?: string;
}

/**
 * Opens WhatsApp to the athlete with the walk-out music brief prefilled
 * (UAE-20).
 *
 * The staffer clicks, sends, and waits for the three links — then fills them in
 * on the grid. The message is signed by whoever is logged in, which is why it
 * reads the session rather than taking a name prop: a brief signed by the wrong
 * person is worse than an unsigned one.
 *
 * Copy is Fernando's, kept verbatim: WhatsApp renders *text* as bold once sent,
 * so the asterisks are intentional and must survive.
 */
export function WalkoutWhatsAppLink({ phone, fighterName, eventName, className }: WalkoutWhatsAppLinkProps) {
  const { user } = useUser();

  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;

  // "UAE Warriors 72" -> "72"; fall back to the whole name if it has no number.
  const eventNumber = (eventName || '').match(/(\d+)\s*$/)?.[1] ?? eventName ?? '';

  // Athlete names arrive with the ops sheet's "[C.2] " prefix.
  const cleanName = fighterName.replace(/^\[[^\]]*\]\s*/, '').trim();
  const staffName = user?.name || 'Event Operations';

  const message = [
    `🇦🇪🏆 *UAE Warriors ${eventNumber}*`,
    '',
    `Dear ${cleanName},`,
    '',
    `Welcome to UAE Warriors ${eventNumber}! My name is ${staffName}, from Event Operations.`,
    '',
    'To ensure a high-impact entrance that meets our broadcasting standards, please review the guidelines for your walkout music:',
    '',
    '*1. Requirements* 📋',
    '• *3 different* song options',
    '• *YouTube links ONLY* 🔗',
    '• Language: English, Portuguese, or Arabic 🗣️',
    '',
    '*2. Content Policy* 🚫',
    'To keep the broadcast professional and neutral, we cannot accept:',
    '• 📿 Religious references',
    '• ⚔️ War or armed-conflict themes',
    '• 🤬 Profanity or explicit language',
    '',
    'Please send your 3 links at your earliest convenience. Any questions, just reach out. 🤝',
    '',
    'Best regards,',
    staffName,
    'Event Operations, UAE Warriors',
  ].join('\n');

  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Send the walk-out music brief to ${cleanName}`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      <MessageCircle className="h-4 w-4 text-green-600 hover:text-green-700 transition-colors" />
    </a>
  );
}
