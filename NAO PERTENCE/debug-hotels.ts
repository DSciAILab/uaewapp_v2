
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
  return acc;
}, {} as any);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugHotels() {
  const eventId = 'bdb7a525-334e-4466-94b1-5ef2e30118ea';

  console.log('--- ENROLLMENTS (All) ---');
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select('*')
    .limit(5);

  if (enrollError) {
      console.log('Error:', enrollError);
  } else {
      console.log('Sample Enrollment:', enrollments[0]);
      console.log('Total fetched:', enrollments.length);
  }
  
  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError);
    return;
  }

  const needsHotelCount = enrollments.filter(e => e.needs_hotel).length;
  console.log(`Total Enrollments: ${enrollments.length}`);
  console.log(`Enrollments with needs_hotel=true: ${needsHotelCount}`);

  console.log('\n--- HOTELS ---');
  const { data: hotels, error: hotelError } = await supabase
    .from('mma_hotels')
    .select('*')
    .limit(10);
  
  if (hotelError) {
    console.error('Error fetching hotels:', hotelError);
    return;
  }
  
  console.log(`Total Hotel Reservations: ${hotels.length}`);

  const hotelEnrolledIds = new Set(hotels.map(h => h.enrollment_id));
  
  console.log('\n--- DISCREPANCY (Needs Hotel BUT Has No Reservation) ---');
  const missing = enrollments.filter(e => e.needs_hotel && !hotelEnrolledIds.has(e.id));
  
  if (missing.length === 0) {
      console.log('No discrepancies found. Everyone who needs a hotel has one.');
  } else {
      missing.forEach(m => {
          console.log(`- Missing: ${m.person?.compiled_name} (Enrollment ID: ${m.id}, Status: ${m.status})`);
      });
  }

  console.log('\n--- SAMPLE OF ALL ENROLLMENTS (First 5) ---');
  enrollments.slice(0, 5).forEach(e => {
      console.log(`${e.person?.compiled_name}: needs_hotel=${e.needs_hotel}`);
  });
}

debugHotels();
