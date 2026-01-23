import { differenceInDays, parseISO, subDays, addDays } from 'date-fns';
import { HotelDivergence, DivergenceType } from '@/types/hotel';

interface FlightDates {
  arrival_datetime: string | null;
  departure_datetime: string | null;
}

interface EventMargins {
  checkin_days_before: number;
  checkout_days_after: number;
}

interface CalculatedDates {
  checkin: Date;
  checkout: Date;
}

export function calculateHotelDates(
  flights: FlightDates,
  eventStartDate: string,
  eventEndDate: string,
  margins: EventMargins = { checkin_days_before: 1, checkout_days_after: 1 }
): CalculatedDates {
  let checkin: Date;
  let checkout: Date;
  
  if (flights.arrival_datetime) {
    checkin = parseISO(flights.arrival_datetime);
  } else {
    checkin = subDays(parseISO(eventStartDate), margins.checkin_days_before);
  }
  
  if (flights.departure_datetime) {
    checkout = parseISO(flights.departure_datetime);
  } else {
    checkout = addDays(parseISO(eventEndDate), margins.checkout_days_after);
  }
  
  return { checkin, checkout };
}

export function detectDivergences(
  calculatedCheckin: Date,
  calculatedCheckout: Date,
  actualCheckin: string,
  actualCheckout: string
): HotelDivergence[] {
  const divergences: HotelDivergence[] = [];
  const actualCheckinDate = parseISO(actualCheckin);
  const actualCheckoutDate = parseISO(actualCheckout);
  
  const checkinDiff = differenceInDays(calculatedCheckin, actualCheckinDate);
  if (checkinDiff > 0) {
    divergences.push({
      type: 'pre_booking',
      description: `Check-in ${checkinDiff} day(s) earlier than expected`,
      days_difference: checkinDiff
    });
  }
  
  const checkoutDiff = differenceInDays(actualCheckoutDate, calculatedCheckout);
  if (checkoutDiff > 0) {
    divergences.push({
      type: 'late_checkout',
      description: `Check-out ${checkoutDiff} day(s) later than expected`,
      days_difference: checkoutDiff
    });
  }
  
  return divergences;
}

export function getPrimaryDivergence(divergences: HotelDivergence[]): DivergenceType | null {
  if (divergences.length === 0) return null;
  
  const priority: DivergenceType[] = ['pre_booking', 'late_checkout', 'early_checkin'];
  
  for (const type of priority) {
    const found = divergences.find(d => d.type === type);
    if (found) return found.type;
  }
  
  return divergences[0].type;
}

export function formatDivergenceLabel(type: DivergenceType): string {
  const labels: Record<DivergenceType, string> = {
    pre_booking: 'Pre-Booking',
    early_checkin: 'Early Check-in',
    late_checkout: 'Late Checkout'
  };
  return labels[type];
}

export function calculateNights(checkin: string, checkout: string): number {
  return differenceInDays(parseISO(checkout), parseISO(checkin));
}
