'use server'

import { createAdminClient } from '@/lib/supabase/server';
import { StagingRow, StagingCheckin } from '@/types/staging';
import { getFightCardData } from '@/lib/services/stats-service'; 
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils';

export async function getPublicStagingData(eventId: string): Promise<StagingRow[]> {
    console.log(`[PublicStaging] Fetching for event: ${eventId}`);
    const supabase = await createAdminClient();

    try {
        // 1. Parallel Fetch: Enrollments, Checkins, Fight Card
        const [enrollmentRes, checkinRes, fightCard] = await Promise.all([
            // Enrollments
            supabase
                .from('mma_enrollments')
                .select(`
                    id,
                    person:mma_people(id, name, surname, nationality, fighter_id, passport_photo, event_name),
                    event:mma_events(name),
                    role:mma_roles!inner(code)
                `)
                .eq('event_id', eventId)
                .eq('status', 'active')
                .eq('role.code', 'F'),
            
            // Checkins
            supabase
                .from('mma_staging_checkins')
                .select('*')
                .eq('event_id', eventId),

            // Fight Card (External CSV)
            getFightCardData()
        ]);

        const enrollments = enrollmentRes.data || [];
        const checkins = checkinRes.data || [];
        
        if (enrollmentRes.error) console.error('[PublicStaging] Enrollment error:', enrollmentRes.error);
        if (checkinRes.error) console.error('[PublicStaging] Checkin error:', checkinRes.error);

        // 2. Maps for fast lookup
        const checkinMap = new Map<string, StagingCheckin>();
        checkins.forEach((c: StagingCheckin) => checkinMap.set(c.enrolled_id, c));

        const processedEnrollmentIds = new Set<string>();
        const result: StagingRow[] = [];

        // 3. Loop 1: Iterate Fight Card (The "Left Table" of our Join)
        // This ensures everyone on the schedule is listed, even if not enrolled.
        for (const fight of fightCard) {
            const fightNameNorm = normalizeName(fight.name || '').toLowerCase();
            
            // Find matching enrollment
            const matchedEnrollment = enrollments.find(enr => {
                if (processedEnrollmentIds.has(enr.id)) return false; // Already taken

                const person = Array.isArray(enr.person) ? enr.person[0] : enr.person;
                if (!person) return false;

                const dbName = `${person.name || ''} ${person.surname || ''}`.trim();
                const dbNameNorm = normalizeName(dbName).toLowerCase();

                // 1. Exact Match
                if (dbNameNorm === fightNameNorm) return true;
                
                // 2. Fuzzy / Token Match
                const fTokens = fightNameNorm.split(/\s+/);
                const dTokens = dbNameNorm.split(/\s+/);
                
                // Very simple fuzzy: if all tokens of one are in the other
                return fTokens.every(t => dbNameNorm.includes(t)) || 
                       dTokens.every(t => fightNameNorm.includes(t));
            });

            // Build Row Result
            if (matchedEnrollment) {
                // CASE A: Scheduled AND Enrolled
                processedEnrollmentIds.add(matchedEnrollment.id);
                const existing = checkinMap.get(matchedEnrollment.id);
                const person = Array.isArray(matchedEnrollment.person) ? matchedEnrollment.person[0] : matchedEnrollment.person;
                const dbName = `${person.name || ''} ${person.surname || ''}`.trim();

                result.push({
                    id: existing?.id || `temp_${matchedEnrollment.id}`,
                    event_id: eventId,
                    enrolled_id: matchedEnrollment.id,
                    bus_number: existing?.bus_number || null,
                    bus_time: existing?.bus_time || null,
                    passport_status: (existing?.passport_status) || 'pending',
                    nails_status: (existing?.nails_status) || 'pending',
                    cup_status: (existing?.cup_status) || 'pending',
                    mouthguard_status: (existing?.mouthguard_status) || 'pending',
                    uniform_status: (existing?.uniform_status) || 'pending',
                    coaches_with_bus_count: existing?.coaches_with_bus_count || 0,
                    coaches_credentials_given: existing?.coaches_credentials_given || 0,
                    notes: existing?.notes || null, // Ensure notes are passed
                    call_order: existing?.call_order || fight.matchNumber || 999,
                    fight_order: fight.matchNumber || null,
                    corner: (fight.corner as any) || null,
                    is_completed: existing?.is_completed || false,
                    created_at: existing?.created_at || new Date().toISOString(),
                    updated_at: existing?.updated_at || new Date().toISOString(),
                    person: {
                        id: person.id,
                        full_name: person.event_name || fight.name || dbName, // Prefer event name -> fight card -> raw db
                        nationality: person.nationality || fight.nationality,
                        fighter_id: person.fighter_id,
                        photo_url: getFighterPhotoUrl(person.fighter_id) || person.passport_photo
                    },
                    event_name: Array.isArray(matchedEnrollment.event) ? (matchedEnrollment.event[0] as any)?.name : (matchedEnrollment.event as any)?.name
                });

            } else {
                // CASE B: Scheduled but NOT Enrolled (Ghost)
                // We show them so staff knows they are missing from DB
                result.push({
                    id: `ghost_${Math.random()}`,
                    event_id: eventId,
                    enrolled_id: 'pending', // No ID yet
                    bus_number: null,
                    bus_time: null,
                    passport_status: 'pending',
                    nails_status: 'pending',
                    cup_status: 'pending',
                    mouthguard_status: 'pending',
                    uniform_status: 'pending',
                    coaches_with_bus_count: 0,
                    coaches_credentials_given: 0,
                    notes: 'Not Enrolled in System',
                    call_order: fight.matchNumber || 999,
                    fight_order: fight.matchNumber || null,
                    corner: (fight.corner as any) || null,
                    is_completed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    person: {
                        id: 'pending',
                        full_name: fight.name,
                        nationality: fight.nationality,
                        fighter_id: '---',
                        photo_url: undefined
                    },
                    event_name: 'Unknown Event' 
                });
            }
        }

        // 4. Loop 2: Remaining Enrollments (The "Right Table" of our Join)
        // Athletes in DB but NOT in Fight Card CSV (e.g. late additions, mismatch names)
        for (const enr of enrollments) {
            if (processedEnrollmentIds.has(enr.id)) continue;

            const existing = checkinMap.get(enr.id);
            const person = Array.isArray(enr.person) ? enr.person[0] : enr.person;
            if (!person) continue;

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
                notes: existing?.notes || 'Not on Fight Card',
                call_order: existing?.call_order || 999,
                fight_order: null, // No order known
                corner: null,
                is_completed: existing?.is_completed || false,
                created_at: existing?.created_at || new Date().toISOString(),
                updated_at: existing?.updated_at || new Date().toISOString(),
                person: {
                    id: person.id,
                    full_name: person.event_name || `${person.name} ${person.surname}`,
                    nationality: person.nationality,
                    fighter_id: person.fighter_id,
                    photo_url: getFighterPhotoUrl(person.fighter_id) || person.passport_photo
                },
                event_name: Array.isArray(enr.event) ? (enr.event[0] as any)?.name : (enr.event as any)?.name
            });
        }

        // 5. Final Sort
        return result.sort((a, b) => {
            const orderA = a.fight_order ?? 9999;
            const orderB = b.fight_order ?? 9999;
            return orderA - orderB;
        });

    } catch (err) {
        console.error('[PublicStaging] Critical error:', err);
        return [];
    }
}
