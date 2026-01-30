'use server'

import { createClient } from '@/lib/supabase/server';
import { getStagingData } from '@/lib/services/staging-service';

// Wrapper to ensure we can fetch this data server-side without client-side RLS issues
// In a real scenario, we might want to check specific public permissions, 
// but for now we assume possessing the eventUUID is enough context or we rely on the service logic.
// However, getStagingData uses the client-side `createClient` import by default in the service file.
// We should probably instantiate a server client here and duplicate the logic OR 
// refactor the service to accept a client. 
// For speed/safety, I will re-implement the fetch logic here using the Server Client which has correct context
// or simply assume the anon key has read access if configured. 
// BUT, often RLS is "auth only". 
// To allow "Public View", we might need the Service Role if RLS is strict, OR ensure RLS allows Anon select on these tables.
// Since I can't easily change RLS right now without SQL, I'll try to use the server client.

// Actually, `getStagingData` imports `createClient` from `@/lib/supabase/client`. 
// That won't work in a Server Action for context.
// I will rewrite a specific fetch function here.

import { StagingRow, StagingCheckin } from '@/types/staging';
import { getFightCardData } from '@/lib/services/stats-service'; // Import from stats-service
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils';

export async function getPublicStagingData(eventId: string): Promise<StagingRow[]> {
    const supabase = await createClient(); // Server client

    // 1. Get all enrollments
    const { data: enrollments, error: enrollError } = await supabase
        .from('mma_enrollments')
        .select(`
            id,
            person:mma_people(id, name, surname, nationality, fighter_id, passport_photo, event_name),
            event:mma_events(name),
            role:mma_roles!inner(code)
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .eq('role.code', 'F');

    if (enrollError) {
        console.error('Public Fetch Error (Enrollments):', enrollError);
        return [];
    }

    if (!enrollments || enrollments.length === 0) return [];

    // 2. Get staging checkins
    const { data: checkins, error: checkinError } = await supabase
        .from('mma_staging_checkins')
        .select('*')
        .eq('event_id', eventId);

    if (checkinError) {
        console.error('Public Fetch Error (Checkins):', checkinError);
        return [];
    }

    // 3. Fight Card
    const fightCard = await getFightCardData();

    const checkinMap = new Map<string, StagingCheckin>();
    checkins?.forEach((c: StagingCheckin) => checkinMap.set(c.enrolled_id, c));

    const result: StagingRow[] = [];

    for (const enr of enrollments) {
        const person = Array.isArray(enr.person) ? enr.person[0] : enr.person;
        if (!person) continue;

        const fullName = `${person.name || ''} ${person.surname || ''}`.trim();

        // Match Logic (Same as service)
        // Match Logic (Improved Fuzzy)
        const match = fightCard.find((c: any) => {
            if (!c.name) return false;
            
            const pName = normalizeName(fullName).toLowerCase();
            const cName = normalizeName(c.name).toLowerCase();
            
            // 1. Direct match
            if (pName === cName) return true;
            if (pName.includes(cName) || cName.includes(pName)) return true;

            // 2. Token match (Handle "Khabib" vs "Khabibulla")
            const pTokens = pName.split(/\s+/);
            const cTokens = cName.split(/\s+/);

            // We want to ensure the Fight Card name (usually simpler) matches the Passport Name (usually longer)
            // Checks if ALL tokens in the short name can be found in the long name
            const allTokensMatch = cTokens.every(cToken => {
                 return pTokens.some(pToken => 
                     pToken === cToken || 
                     pToken.startsWith(cToken) ||  // "Khabibulla" starts with "Khabib"
                     cToken.startsWith(pToken)     // "Chris" starts with "Christopher"? No, other way
                 );
            });

            return allTokensMatch;
        });

        if (!match) continue; // Skip if not on fight card

        const existing = checkinMap.get(enr.id);
        const displayName = person.event_name || match.name || fullName;

        result.push({
            id: existing?.id || `temp_${enr.id}`,
            event_id: eventId,
            enrolled_id: enr.id,
            bus_number: existing?.bus_number || null,
            bus_time: existing?.bus_time || null,
            passport_status: (existing?.passport_status) || 'pending',
            nails_status: (existing?.nails_status) || 'pending',
            cup_status: (existing?.cup_status) || 'pending',
            mouthguard_status: (existing?.mouthguard_status) || 'pending',
            uniform_status: (existing?.uniform_status) || 'pending',
            coaches_with_bus_count: existing?.coaches_with_bus_count || 0,
            coaches_credentials_given: existing?.coaches_credentials_given || 0,
            notes: existing?.notes || null,
            call_order: existing?.call_order || match.matchNumber || 999,
            fight_order: match.matchNumber || null,
            corner: match.corner || null,
            is_completed: existing?.is_completed || false,
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: existing?.updated_at || new Date().toISOString(),
            person: {
                id: person.id,
                full_name: displayName,
                nationality: person.nationality,
                fighter_id: person.fighter_id,
                photo_url: getFighterPhotoUrl(person.fighter_id) || person.passport_photo
            },
            event_name: Array.isArray(enr.event) ? (enr.event[0] as any)?.name : (enr.event as any)?.name
        });
    }

    return result.sort((a, b) => {
        const orderA = a.fight_order ?? 999;
        const orderB = b.fight_order ?? 999;
        return orderA - orderB;
    });
}
