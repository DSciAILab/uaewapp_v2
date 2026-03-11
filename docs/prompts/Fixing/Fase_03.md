FASE 3: Transport (Sprint 05 — Parte 2)
O que o schema real tem:

mma_transport_drivers (não mma_drivers): name, phone, notes, is_active
mma_transport_cars (não mma_event_cars): event_id, car_number, type (arrival/departure/event), vehicle_type, driver_id, flight_number, flight_date, flight_time, airport, route_from, route_to, scheduled_date, scheduled_time, status
mma_transport_passengers (não mma_car_passengers): car_id, enrollment_id
O que o serviço assume (e não existe):

Tabelas com nomes errados. Campos como car_label, capacity, license_plate em cars. Campos como transport_type, pickup_location, dropoff_location, pickup_time, flight_id em passengers.

O que fazer:

Corrigir os nomes das tabelas. Simplificar o serviço para usar os campos que realmente existem. O modelo real é mais simples: um carro tem um tipo fixo (arrival/departure/event), não tem capacidade explícita, e os passageiros são uma relação simples car↔enrollment sem metadados.

