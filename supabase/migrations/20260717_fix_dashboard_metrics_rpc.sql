-- INF-691 F0: get_event_dashboard_metrics still queried tables dropped by the
-- 2026-07-15 consolidation (mma_transport_cars, mma_transport_passengers,
-- mma_athlete_tasks, mma_pre_event_checks), so the dashboard RPC 404'd and the
-- event page rendered black. Repoint to the live families.
CREATE OR REPLACE FUNCTION public.get_event_dashboard_metrics(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_metrics JSONB;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT jsonb_build_object(
        -- Enrollment Metrics
        'total_enrolled', (SELECT count(*) FROM public.mma_enrollments WHERE event_id = p_event_id AND status = 'active'),
        'fighters', (SELECT count(*) FROM public.mma_enrollments e JOIN public.mma_roles r ON e.role_id = r.id WHERE e.event_id = p_event_id AND e.status = 'active' AND r.code = 'F'),
        'staff', (SELECT count(*) FROM public.mma_enrollments e JOIN public.mma_roles r ON e.role_id = r.id WHERE e.event_id = p_event_id AND e.status = 'active' AND r.code = 'ST'),
        'vips', (SELECT count(*) FROM public.mma_enrollments e JOIN public.mma_roles r ON e.role_id = r.id WHERE e.event_id = p_event_id AND e.status = 'active' AND r.code = 'G'),

        -- Flight Metrics
        'total_flights', (SELECT count(*) FROM public.mma_flights f JOIN public.mma_enrollments e ON f.enrollment_id = e.id WHERE e.event_id = p_event_id),
        'arrivals_today', (SELECT count(*) FROM public.mma_flights f JOIN public.mma_enrollments e ON f.enrollment_id = e.id WHERE e.event_id = p_event_id AND f.arrival_date = v_today),
        'departures_today', (SELECT count(*) FROM public.mma_flights f JOIN public.mma_enrollments e ON f.enrollment_id = e.id WHERE e.event_id = p_event_id AND f.departure_date = v_today),
        'pending_tickets', (SELECT count(*) FROM public.mma_flights f JOIN public.mma_enrollments e ON f.enrollment_id = e.id WHERE e.event_id = p_event_id AND f.status = 'pending'),

        -- Visa Metrics
        'total_visas', (SELECT count(*) FROM public.mma_visas v JOIN public.mma_enrollments e ON v.enrollment_id = e.id WHERE e.event_id = p_event_id),
        'visas_approved', (SELECT count(*) FROM public.mma_visas v JOIN public.mma_enrollments e ON v.enrollment_id = e.id WHERE e.event_id = p_event_id AND v.status = 6),
        'visas_pending', (SELECT count(*) FROM public.mma_visas v JOIN public.mma_enrollments e ON v.enrollment_id = e.id WHERE e.event_id = p_event_id AND v.status BETWEEN 2 AND 4),
        'visas_denied', (SELECT count(*) FROM public.mma_visas v JOIN public.mma_enrollments e ON v.enrollment_id = e.id WHERE e.event_id = p_event_id AND v.status = 5),

        -- Hotel Metrics
        'total_reservations', (SELECT count(*) FROM public.mma_hotels h JOIN public.mma_enrollments e ON h.enrollment_id = e.id WHERE e.event_id = p_event_id),
        'hotels_confirmed', (SELECT count(*) FROM public.mma_hotels h JOIN public.mma_enrollments e ON h.enrollment_id = e.id WHERE e.event_id = p_event_id AND h.status = 'confirmed'),
        'hotels_pending', (SELECT count(*) FROM public.mma_hotels h JOIN public.mma_enrollments e ON h.enrollment_id = e.id WHERE e.event_id = p_event_id AND h.status = 'pending'),
        'divergences_pending', (SELECT count(*) FROM public.mma_hotels h JOIN public.mma_enrollments e ON h.enrollment_id = e.id WHERE e.event_id = p_event_id AND h.has_divergence AND (h.divergence_approved IS NULL OR h.divergence_approved = false)),

        -- Transport Metrics (mma_event_cars / mma_car_passengers)
        'total_cars', (SELECT count(*) FROM public.mma_event_cars WHERE event_id = p_event_id),
        'arrivals_assigned', (SELECT count(*) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'arrival'),
        'departures_assigned', (SELECT count(*) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'departure'),
        'unassigned_arrivals', (
            COALESCE((SELECT count(*) FROM public.mma_enrollments WHERE event_id = p_event_id AND needs_transport IN ('arrival', 'both') AND status = 'active'), 0) -
            COALESCE((SELECT count(DISTINCT p.enrolled_id) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'arrival'), 0)
        ),
        'unassigned_departures', (
            COALESCE((SELECT count(*) FROM public.mma_enrollments WHERE event_id = p_event_id AND needs_transport IN ('departure', 'both') AND status = 'active'), 0) -
            COALESCE((SELECT count(DISTINCT p.enrolled_id) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'departure'), 0)
        ),
        'unassigned_transport', (
            (COALESCE((SELECT count(*) FROM public.mma_enrollments WHERE event_id = p_event_id AND needs_transport IN ('arrival', 'both') AND status = 'active'), 0) -
             COALESCE((SELECT count(DISTINCT p.enrolled_id) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'arrival'), 0)) +
            (COALESCE((SELECT count(*) FROM public.mma_enrollments WHERE event_id = p_event_id AND needs_transport IN ('departure', 'both') AND status = 'active'), 0) -
             COALESCE((SELECT count(DISTINCT p.enrolled_id) FROM public.mma_car_passengers p JOIN public.mma_event_cars c ON p.car_id = c.id WHERE c.event_id = p_event_id AND p.transport_type = 'departure'), 0))
        ),

        -- Pre-event Clearance Metrics (mma_pre_event_clearance)
        'clearance_complete', (SELECT count(*) FROM public.mma_pre_event_clearance WHERE event_id = p_event_id AND status = 'cleared'),
        'clearance_pending', (SELECT count(*) FROM public.mma_pre_event_clearance WHERE event_id = p_event_id AND status NOT IN ('cleared', 'denied')),
        'clearance_denied', (SELECT count(*) FROM public.mma_pre_event_clearance WHERE event_id = p_event_id AND status = 'denied'),

        -- Task Metrics (mma_event_tasks)
        'total_tasks', (SELECT count(*) FROM public.mma_event_tasks WHERE event_id = p_event_id),
        'tasks_completed', (SELECT count(*) FROM public.mma_event_tasks WHERE event_id = p_event_id AND status = 'completed'),
        'tasks_in_progress', (SELECT count(*) FROM public.mma_event_tasks WHERE event_id = p_event_id AND status = 'in_progress'),
        'tasks_overdue', (SELECT count(*) FROM public.mma_event_tasks WHERE event_id = p_event_id AND status NOT IN ('completed', 'cancelled') AND due_date < v_today),

        -- Batch Metrics
        'total_batches', (SELECT count(*) FROM public.mma_batches WHERE event_id = p_event_id),
        'batches_today', (SELECT count(*) FROM public.mma_batches WHERE event_id = p_event_id AND scheduled_date = v_today),
        'batches_completed', (SELECT count(*) FROM public.mma_batches WHERE event_id = p_event_id AND status = 'arrived')
    ) INTO v_metrics;

    RETURN v_metrics;
END;
$function$;
