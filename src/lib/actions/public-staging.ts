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
                    person:mma_people(id, name, surname, nationality, appadmin_fighter_id, passport_photo, event_name),
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

        const result: StagingRow[] = [];

            // Start of Logic aligned with staging-service.ts
            // We iterate ONLY enrollments. The Fight Card is used for enrichment/lookup only.
            // This prevents "Ghosts" from mismatched events and ensures 1:1 parity with Admin Panel.

            for (const enr of enrollments) {
                const person = Array.isArray(enr.person) ? enr.person[0] : enr.person;
                
                if (!person) {
                    console.warn('[PublicStaging] Missing person for enrollment:', enr.id);
                    continue;
                }

                const fullName = `${person.name || ''} ${person.surname || ''}`.trim();
                const eventName = person.event_name || '';

                // Find match in Fight Card (No Filtering, just strict logic)
                const matchData = fightCard.find((fight: any) => {
                    const cName = normalizeName(fight.name || '');
                    const pName = normalizeName(fullName);
                    const eName = normalizeName(eventName);
                    
                    // Robust matching from staging-service.ts
                    return pName === cName || 
                           eName === cName || 
                           (cName.length > 3 && pName.includes(cName)) || 
                           (pName.length > 3 && cName.includes(pName)) ||
                           (cName.length > 3 && eName.includes(cName)) ||
                           (eName.length > 3 && cName.includes(eName));
                }) || { matchNumber: null, corner: null, name: null }; // Default if no match

                const existing = checkinMap.get(enr.id);
                const dbName = fullName;

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
                    call_order: existing?.call_order || matchData.matchNumber || 999, // Fallback to end
                    fight_order: matchData.matchNumber || null,
                    corner: (matchData.corner as any) || null,
                    is_completed: existing?.is_completed || false,
                    created_at: existing?.created_at || new Date().toISOString(),
                    updated_at: existing?.updated_at || new Date().toISOString(),
                    person: {
                        id: person.id,
                        compiled_name: matchData.name || person.event_name || fullName, // Use Fight Card name -> Event Name -> Full Name
                        nationality: person.nationality,
                        appadmin_fighter_id: person.appadmin_fighter_id,
                        photo_url: getFighterPhotoUrl(person.appadmin_fighter_id) || person.passport_photo
                    },
                    event_name: Array.isArray(enr.event) ? (enr.event[0] as any)?.name : (enr.event as any)?.name
                });
            }

            // Final Sort matches staging-service
            return result.sort((a, b) => {
                // Sort by fight_order (ascending), nulls last
                const orderA = a.fight_order ?? 999;
                const orderB = b.fight_order ?? 999;
                return orderA - orderB;
            });

    } catch (err) {
        console.error('[PublicStaging] Critical error:', err);
        return [];
    }
}


