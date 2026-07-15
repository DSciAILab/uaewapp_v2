-- ============================================================
-- 00_DATABASE_FOUNDATION.sql
-- MMA EVENT MANAGEMENT SYSTEM - Fundação Completa do Banco
-- Gerado por VIBE PROJECT ARCHITECT v4.5
-- Data: 2026-01-22
-- ============================================================
--
-- ⚠️  INSTRUÇÕES:
-- 1. Acesse seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá em "SQL Editor"
-- 3. Cole TODO este conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a mensagem "Success"
-- 6. SÓ ENTÃO rode o projeto local (pnpm dev)
--
-- ============================================================

-- ============================================================
-- PARTE 1: CONFIGURAÇÃO INICIAL
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema privado para auditoria
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM public;
GRANT USAGE ON SCHEMA app_private TO postgres, service_role;

-- ============================================================
-- PARTE 2: TABELAS DE SISTEMA (CORE)
-- ============================================================

-- Tabela: mma_users
-- Descrição: Usuários do sistema (não atletas)
CREATE TABLE IF NOT EXISTS public.mma_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL DEFAULT 'Usuário',
    avatar_url TEXT,
    user_type VARCHAR(20) NOT NULL DEFAULT 'temporary' CHECK (user_type IN ('admin', 'staff', 'temporary')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_users_email ON public.mma_users(email);
CREATE INDEX idx_mma_users_user_type ON public.mma_users(user_type);
CREATE INDEX idx_mma_users_is_active ON public.mma_users(is_active);

-- Tabela: mma_user_invites
-- Descrição: Convites para novos usuários
CREATE TABLE IF NOT EXISTS public.mma_user_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    user_type VARCHAR(20) NOT NULL DEFAULT 'temporary' CHECK (user_type IN ('admin', 'staff', 'temporary')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.mma_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_user_invites_email ON public.mma_user_invites(email);
CREATE INDEX idx_mma_user_invites_token ON public.mma_user_invites(token);

-- Tabela: mma_permission_areas
-- Descrição: Áreas do sistema para permissões
CREATE TABLE IF NOT EXISTS public.mma_permission_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- Inserir áreas pré-definidas
INSERT INTO public.mma_permission_areas (code, name, display_order) VALUES
    ('people', 'People Database', 1),
    ('events', 'Eventos', 2),
    ('flights', 'Aéreo', 3),
    ('visas', 'Vistos', 4),
    ('hotels', 'Hotel', 5),
    ('transport', 'Transporte', 6),
    ('operations', 'Operações', 7),
    ('pre_event', 'Pre-event Check', 8),
    ('admin', 'Administração', 9)
ON CONFLICT (code) DO NOTHING;

-- Tabela: mma_user_permissions
-- Descrição: Permissões por usuário e área
CREATE TABLE IF NOT EXISTS public.mma_user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.mma_users(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.mma_permission_areas(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    UNIQUE(user_id, area_id)
);

CREATE INDEX idx_mma_user_permissions_user ON public.mma_user_permissions(user_id);

-- Tabela: mma_roles
-- Descrição: Tipos de pessoa (Fighter, Corner, Staff, Guest)
CREATE TABLE IF NOT EXISTS public.mma_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(5) NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.mma_roles(id),
    is_base BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir roles base
INSERT INTO public.mma_roles (name, code, is_base) VALUES
    ('Fighter', 'F', true),
    ('Corner', 'C', true),
    ('Guest', 'G', true),
    ('Staff', 'ST', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PARTE 3: TABELAS DE PESSOAS
-- ============================================================

-- Tabela: mma_people
-- Descrição: Base mãe de todas as pessoas
CREATE TABLE IF NOT EXISTS public.mma_people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    compiled_name VARCHAR(200) GENERATED ALWAYS AS (
        INITCAP(TRIM(name)) || ' ' || INITCAP(TRIM(surname))
    ) STORED,
    event_name VARCHAR(200),
    fighter_id INTEGER,
    gender VARCHAR(20),
    phone VARCHAR(30),
    dob DATE,
    nationality VARCHAR(100),
    passport_number VARCHAR(50),
    passport_expiry DATE,
    passport_photo TEXT,
    document_folder TEXT,
    height DECIMAL(5,2),
    reach DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_people_compiled_name ON public.mma_people(compiled_name);
CREATE INDEX idx_mma_people_fighter_id ON public.mma_people(fighter_id);
CREATE INDEX idx_mma_people_nationality ON public.mma_people(nationality);
CREATE INDEX idx_mma_people_passport_expiry ON public.mma_people(passport_expiry);

-- Tabela: mma_people_documents
-- Descrição: Documentos adicionais por pessoa
CREATE TABLE IF NOT EXISTS public.mma_people_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES public.mma_people(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    document_link TEXT NOT NULL,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_people_documents_person ON public.mma_people_documents(person_id);

-- ============================================================
-- PARTE 4: TABELAS DE EVENTOS
-- ============================================================

-- Tabela: mma_events
-- Descrição: Configuração de eventos
CREATE TABLE IF NOT EXISTS public.mma_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    event_date DATE NOT NULL,
    event_end_date DATE,
    city VARCHAR(100),
    country VARCHAR(100),
    venue VARCHAR(200),
    main_airport VARCHAR(10),
    checkin_margin_hours INTEGER NOT NULL DEFAULT 3,
    checkout_margin_hours INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    fight_card_csv_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_events_status ON public.mma_events(status);
CREATE INDEX idx_mma_events_event_date ON public.mma_events(event_date);

-- Tabela: mma_event_checklist_items
-- Descrição: Itens do checklist pre-event por evento
CREATE TABLE IF NOT EXISTS public.mma_event_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.mma_events(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(20) NOT NULL DEFAULT 'extra' CHECK (item_type IN ('fixed', 'extra')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mma_event_checklist_items_event ON public.mma_event_checklist_items(event_id);

-- Tabela: mma_enrollments
-- Descrição: Pessoas inscritas no evento
CREATE TABLE IF NOT EXISTS public.mma_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.mma_events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.mma_people(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.mma_roles(id),
    event_code VARCHAR(10),
    event_code_seq INTEGER,
    needs_flight VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (needs_flight IN ('none', 'arrival_only', 'departure_only', 'full')),
    needs_visa BOOLEAN NOT NULL DEFAULT false,
    needs_hotel BOOLEAN NOT NULL DEFAULT false,
    needs_transport VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (needs_transport IN ('none', 'arrival', 'departure', 'both')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'replaced')),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.mma_users(id),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    UNIQUE(event_id, person_id)
);

CREATE INDEX idx_mma_enrollments_event ON public.mma_enrollments(event_id);
CREATE INDEX idx_mma_enrollments_person ON public.mma_enrollments(person_id);
CREATE INDEX idx_mma_enrollments_role ON public.mma_enrollments(role_id);
CREATE INDEX idx_mma_enrollments_status ON public.mma_enrollments(status);
CREATE INDEX idx_mma_enrollments_event_code ON public.mma_enrollments(event_code);

-- Tabela: mma_enrollment_corners
-- Descrição: Vínculo entre fighter e corners
CREATE TABLE IF NOT EXISTS public.mma_enrollment_corners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fighter_enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    corner_enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    UNIQUE(fighter_enrollment_id, corner_enrollment_id)
);

CREATE INDEX idx_mma_enrollment_corners_fighter ON public.mma_enrollment_corners(fighter_enrollment_id);
CREATE INDEX idx_mma_enrollment_corners_corner ON public.mma_enrollment_corners(corner_enrollment_id);

-- ============================================================
-- PARTE 5: TABELAS DE LOGÍSTICA
-- ============================================================

-- Tabela: mma_flights
-- Descrição: Informações de voo
CREATE TABLE IF NOT EXISTS public.mma_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('arrival_only', 'departure_only', 'full')),
    arrival_reservation VARCHAR(50),
    arrival_flight_number VARCHAR(20),
    arrival_date DATE,
    arrival_time TIME,
    arrival_airport VARCHAR(10),
    arrival_ticket_link TEXT,
    departure_reservation VARCHAR(50),
    departure_flight_number VARCHAR(20),
    departure_date DATE,
    departure_time TIME,
    departure_airport VARCHAR(10),
    departure_ticket_link TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'booked', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    updated_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_flights_enrollment ON public.mma_flights(enrollment_id);
CREATE INDEX idx_mma_flights_status ON public.mma_flights(status);
CREATE INDEX idx_mma_flights_arrival_date ON public.mma_flights(arrival_date);
CREATE INDEX idx_mma_flights_departure_date ON public.mma_flights(departure_date);

-- Tabela: mma_visas
-- Descrição: Controle de vistos
CREATE TABLE IF NOT EXISTS public.mma_visas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    passport_name VARCHAR(200),
    nationality VARCHAR(100),
    departure_airport VARCHAR(10),
    document_link TEXT,
    status INTEGER NOT NULL DEFAULT 2 CHECK (status IN (1, 2, 3, 4, 5, 6)),
    -- 1=Not Required, 2=Required, 3=Applied, 4=Approval, 5=Rejected, 6=Resident
    is_done BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    updated_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_visas_enrollment ON public.mma_visas(enrollment_id);
CREATE INDEX idx_mma_visas_status ON public.mma_visas(status);
CREATE INDEX idx_mma_visas_is_done ON public.mma_visas(is_done);

-- Tabela: mma_hotels
-- Descrição: Reservas de hotel
CREATE TABLE IF NOT EXISTS public.mma_hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    suggested_checkin_date DATE,
    suggested_checkin_time TIME,
    suggested_checkout_date DATE,
    suggested_checkout_time TIME,
    reservation_number VARCHAR(50),
    checkin_date DATE,
    checkin_time TIME,
    checkout_date DATE,
    checkout_time TIME,
    has_divergence BOOLEAN NOT NULL DEFAULT false,
    divergence_type TEXT[],
    divergence_approved BOOLEAN,
    divergence_approved_by UUID REFERENCES public.mma_users(id),
    divergence_approved_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reserved', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    updated_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_hotels_enrollment ON public.mma_hotels(enrollment_id);
CREATE INDEX idx_mma_hotels_status ON public.mma_hotels(status);
CREATE INDEX idx_mma_hotels_has_divergence ON public.mma_hotels(has_divergence);

-- Tabela: mma_transport_drivers
-- Descrição: Cadastro de motoristas (global)
CREATE TABLE IF NOT EXISTS public.mma_transport_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mma_transport_drivers_is_active ON public.mma_transport_drivers(is_active);

-- Tabela: mma_transport_cars
-- Descrição: Veículos/carros por evento
CREATE TABLE IF NOT EXISTS public.mma_transport_cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.mma_events(id) ON DELETE CASCADE,
    car_number INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('arrival', 'departure', 'event')),
    vehicle_type VARCHAR(30),
    driver_id UUID REFERENCES public.mma_transport_drivers(id),
    flight_number VARCHAR(20),
    flight_date DATE,
    flight_time TIME,
    airport VARCHAR(10),
    route_from VARCHAR(200),
    route_to VARCHAR(200),
    scheduled_date DATE,
    scheduled_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, car_number)
);

CREATE INDEX idx_mma_transport_cars_event ON public.mma_transport_cars(event_id);
CREATE INDEX idx_mma_transport_cars_type ON public.mma_transport_cars(type);
CREATE INDEX idx_mma_transport_cars_status ON public.mma_transport_cars(status);

-- Tabela: mma_transport_passengers
-- Descrição: Passageiros por carro
CREATE TABLE IF NOT EXISTS public.mma_transport_passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL REFERENCES public.mma_transport_cars(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(car_id, enrollment_id)
);

CREATE INDEX idx_mma_transport_passengers_car ON public.mma_transport_passengers(car_id);
CREATE INDEX idx_mma_transport_passengers_enrollment ON public.mma_transport_passengers(enrollment_id);

-- ============================================================
-- PARTE 6: TABELAS DE OPERAÇÕES
-- ============================================================

-- Tabela: mma_athlete_stats
-- Descrição: Estatísticas variáveis por evento
CREATE TABLE IF NOT EXISTS public.mma_athlete_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    city VARCHAR(100),
    weight DECIMAL(5,2),
    gym VARCHAR(200),
    fightstyle VARCHAR(100),
    tshirt_size VARCHAR(10),
    corner1_tshirt VARCHAR(10),
    corner2_tshirt VARCHAR(10),
    corner3_tshirt VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_athlete_stats_enrollment ON public.mma_athlete_stats(enrollment_id);

-- Tabela: mma_athlete_music
-- Descrição: Músicas de entrada
CREATE TABLE IF NOT EXISTS public.mma_athlete_music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    music_link_1 TEXT,
    music_link_2 TEXT,
    music_link_3 TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_athlete_music_enrollment ON public.mma_athlete_music(enrollment_id);

-- Tabela: mma_athlete_tasks
-- Descrição: Tarefas (blood test, photoshoot, video shoot)
CREATE TABLE IF NOT EXISTS public.mma_athlete_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    task_type VARCHAR(30) NOT NULL CHECK (task_type IN ('blood_test', 'photoshoot', 'video_shoot')),
    status VARCHAR(20) NOT NULL DEFAULT 'not_required' CHECK (status IN ('not_required', 'required', 'done')),
    scheduled_date DATE,
    scheduled_time TIME,
    location VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.mma_users(id),
    UNIQUE(enrollment_id, task_type)
);

CREATE INDEX idx_mma_athlete_tasks_enrollment ON public.mma_athlete_tasks(enrollment_id);
CREATE INDEX idx_mma_athlete_tasks_type ON public.mma_athlete_tasks(task_type);
CREATE INDEX idx_mma_athlete_tasks_status ON public.mma_athlete_tasks(status);

-- Tabela: mma_pre_event_checks
-- Descrição: Checklist preenchido por atleta
CREATE TABLE IF NOT EXISTS public.mma_pre_event_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES public.mma_event_checklist_items(id) ON DELETE CASCADE,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    value VARCHAR(50),
    notes TEXT,
    checked_at TIMESTAMPTZ,
    checked_by UUID REFERENCES public.mma_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(enrollment_id, checklist_item_id)
);

CREATE INDEX idx_mma_pre_event_checks_enrollment ON public.mma_pre_event_checks(enrollment_id);
CREATE INDEX idx_mma_pre_event_checks_item ON public.mma_pre_event_checks(checklist_item_id);

-- Tabela: mma_batches
-- Descrição: Agrupamentos para transfer
CREATE TABLE IF NOT EXISTS public.mma_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.mma_events(id) ON DELETE CASCADE,
    batch_number INTEGER NOT NULL,
    name VARCHAR(100),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    route_from VARCHAR(200),
    route_to VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id),
    UNIQUE(event_id, batch_number)
);

CREATE INDEX idx_mma_batches_event ON public.mma_batches(event_id);
CREATE INDEX idx_mma_batches_status ON public.mma_batches(status);

-- Tabela: mma_batch_passengers
-- Descrição: Passageiros por batch
CREATE TABLE IF NOT EXISTS public.mma_batch_passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.mma_batches(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    checklist_done BOOLEAN NOT NULL DEFAULT false,
    is_boarded BOOLEAN NOT NULL DEFAULT false,
    boarded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, enrollment_id)
);

CREATE INDEX idx_mma_batch_passengers_batch ON public.mma_batch_passengers(batch_id);
CREATE INDEX idx_mma_batch_passengers_enrollment ON public.mma_batch_passengers(enrollment_id);

-- ============================================================
-- PARTE 7: TABELAS DE MENSAGENS (FUTURO)
-- ============================================================

-- Tabela: mma_messages
-- Descrição: Mensagens para o App do Atleta
CREATE TABLE IF NOT EXISTS public.mma_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.mma_events(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('all', 'role', 'batch', 'individual')),
    target_role_id UUID REFERENCES public.mma_roles(id),
    target_batch_id UUID REFERENCES public.mma_batches(id),
    target_enrollment_id UUID REFERENCES public.mma_enrollments(id),
    title VARCHAR(200),
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.mma_users(id)
);

CREATE INDEX idx_mma_messages_event ON public.mma_messages(event_id);
CREATE INDEX idx_mma_messages_target_type ON public.mma_messages(target_type);

-- Tabela: mma_message_attachments
-- Descrição: Anexos de mensagens
CREATE TABLE IF NOT EXISTS public.mma_message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.mma_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(200) NOT NULL,
    file_type VARCHAR(20),
    file_link TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mma_message_attachments_message ON public.mma_message_attachments(message_id);

-- Tabela: mma_message_reads
-- Descrição: Controle de leitura
CREATE TABLE IF NOT EXISTS public.mma_message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.mma_messages(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.mma_enrollments(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, enrollment_id)
);

CREATE INDEX idx_mma_message_reads_message ON public.mma_message_reads(message_id);
CREATE INDEX idx_mma_message_reads_enrollment ON public.mma_message_reads(enrollment_id);

-- ============================================================
-- PARTE 8: TABELA DE AUDITORIA
-- ============================================================

-- Tabela: mma_audit_logs (schema privado)
CREATE TABLE IF NOT EXISTS app_private.mma_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mma_audit_logs_table ON app_private.mma_audit_logs(table_name);
CREATE INDEX idx_mma_audit_logs_record ON app_private.mma_audit_logs(record_id);
CREATE INDEX idx_mma_audit_logs_action ON app_private.mma_audit_logs(action);
CREATE INDEX idx_mma_audit_logs_user ON app_private.mma_audit_logs(user_id);
CREATE INDEX idx_mma_audit_logs_created ON app_private.mma_audit_logs(created_at);

-- ============================================================
-- PARTE 9: FUNÇÕES E TRIGGERS
-- ============================================================

-- Função: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

$$;

-- Função: Criar perfil de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.mma_users (id, email, name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            'Usuário'
        ),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(EXCLUDED.name, ''), mma_users.name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;

$$;

-- Função: Gerar Event Code (F.001, C.002, etc.)
CREATE OR REPLACE FUNCTION public.generate_event_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    role_code VARCHAR(5);
    next_seq INTEGER;
BEGIN
    -- Buscar código do role
    SELECT code INTO role_code FROM public.mma_roles WHERE id = NEW.role_id;
    
    -- Buscar próximo sequencial do evento
    SELECT COALESCE(MAX(event_code_seq), 0) + 1 INTO next_seq
    FROM public.mma_enrollments
    WHERE event_id = NEW.event_id;
    
    -- Gerar código
    NEW.event_code := role_code || '.' || LPAD(next_seq::TEXT, 3, '0');
    NEW.event_code_seq := next_seq;
    
    RETURN NEW;
END;

$$;

-- Função: Criar itens fixos do checklist ao criar evento
CREATE OR REPLACE FUNCTION public.create_default_checklist_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.mma_event_checklist_items (event_id, item_name, item_type, display_order)
    VALUES
        (NEW.id, 'Passport', 'fixed', 1),
        (NEW.id, 'Uniform', 'fixed', 2),
        (NEW.id, 'Mouthguard', 'fixed', 3),
        (NEW.id, 'Groin Guard', 'fixed', 4),
        (NEW.id, 'Corners Accredited', 'fixed', 5);
    
    RETURN NEW;
END;

$$;

-- Função: Auditoria genérica
CREATE OR REPLACE FUNCTION app_private.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed TEXT[];
    key TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
        
        INSERT INTO app_private.mma_audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, new_data, auth.uid());
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Encontrar campos alterados
        FOR key IN SELECT jsonb_object_keys(new_data)
        LOOP
            IF old_data->key IS DISTINCT FROM new_data->key THEN
                changed := array_append(changed, key);
            END IF;
        END LOOP;
        
        -- Só registra se houver mudanças reais (exceto updated_at)
        changed := array_remove(changed, 'updated_at');
        
        IF array_length(changed, 1) > 0 THEN
            INSERT INTO app_private.mma_audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed, auth.uid());
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
        
        INSERT INTO app_private.mma_audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', old_data, new_data, auth.uid());
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;

$$;

-- ============================================================
-- PARTE 10: APLICAR TRIGGERS
-- ============================================================

-- Trigger: Criar perfil quando usuário se cadastra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Gerar event_code no enrollment
DROP TRIGGER IF EXISTS generate_event_code_trigger ON public.mma_enrollments;
CREATE TRIGGER generate_event_code_trigger
    BEFORE INSERT ON public.mma_enrollments
    FOR EACH ROW EXECUTE FUNCTION public.generate_event_code();

-- Trigger: Criar checklist padrão ao criar evento
DROP TRIGGER IF EXISTS create_default_checklist_trigger ON public.mma_events;
CREATE TRIGGER create_default_checklist_trigger
    AFTER INSERT ON public.mma_events
    FOR EACH ROW EXECUTE FUNCTION public.create_default_checklist_items();

-- Triggers: updated_at em todas as tabelas relevantes
CREATE TRIGGER update_mma_users_updated_at BEFORE UPDATE ON public.mma_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_people_updated_at BEFORE UPDATE ON public.mma_people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_events_updated_at BEFORE UPDATE ON public.mma_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_enrollments_updated_at BEFORE UPDATE ON public.mma_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_flights_updated_at BEFORE UPDATE ON public.mma_flights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_visas_updated_at BEFORE UPDATE ON public.mma_visas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_hotels_updated_at BEFORE UPDATE ON public.mma_hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_transport_drivers_updated_at BEFORE UPDATE ON public.mma_transport_drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_transport_cars_updated_at BEFORE UPDATE ON public.mma_transport_cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_athlete_stats_updated_at BEFORE UPDATE ON public.mma_athlete_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_athlete_music_updated_at BEFORE UPDATE ON public.mma_athlete_music FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_athlete_tasks_updated_at BEFORE UPDATE ON public.mma_athlete_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_pre_event_checks_updated_at BEFORE UPDATE ON public.mma_pre_event_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_batches_updated_at BEFORE UPDATE ON public.mma_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_mma_batch_passengers_updated_at BEFORE UPDATE ON public.mma_batch_passengers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers: Auditoria nas tabelas principais
CREATE TRIGGER audit_mma_people AFTER INSERT OR UPDATE OR DELETE ON public.mma_people FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();
CREATE TRIGGER audit_mma_events AFTER INSERT OR UPDATE OR DELETE ON public.mma_events FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();
CREATE TRIGGER audit_mma_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.mma_enrollments FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();
CREATE TRIGGER audit_mma_flights AFTER INSERT OR UPDATE OR DELETE ON public.mma_flights FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();
CREATE TRIGGER audit_mma_visas AFTER INSERT OR UPDATE OR DELETE ON public.mma_visas FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();
CREATE TRIGGER audit_mma_hotels AFTER INSERT OR UPDATE OR DELETE ON public.mma_hotels FOR EACH ROW EXECUTE FUNCTION app_private.audit_trigger();

Error: Failed to run sql query: ERROR: 42601: only WITH CHECK expression allowed for INSERT

-- ============================================================
-- PARTE 11: ROW LEVEL SECURITY (RLS) - CORRIGIDO
-- ============================================================

-- Ativar RLS em todas as tabelas públicas
ALTER TABLE public.mma_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_permission_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_people_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_event_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_enrollment_corners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_transport_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_transport_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_athlete_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_athlete_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_athlete_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_pre_event_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_batch_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_message_reads ENABLE ROW LEVEL SECURITY;

-- Função helper: verificar se usuário está ativo e não expirado
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT is_active, expires_at INTO user_record
    FROM public.mma_users
    WHERE id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF NOT user_record.is_active THEN
        RETURN FALSE;
    END IF;
    
    IF user_record.expires_at IS NOT NULL AND user_record.expires_at < NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;

$$;

-- Função helper: verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.mma_users
        WHERE id = auth.uid()
        AND user_type = 'admin'
        AND is_active = true
    );
END;

$$;

-- Função helper: verificar permissão em área
CREATE OR REPLACE FUNCTION public.has_permission(area_code TEXT, required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Admin tem acesso total
    IF public.is_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar permissão específica
    RETURN EXISTS (
        SELECT 1 FROM public.mma_user_permissions p
        JOIN public.mma_permission_areas a ON p.area_id = a.id
        WHERE p.user_id = auth.uid()
        AND a.code = area_code
        AND (
            p.permission = required_permission
            OR (required_permission = 'view' AND p.permission = 'edit')
        )
    );
END;

$$;

-- ============================================================
-- POLICIES: mma_users
-- ============================================================
CREATE POLICY "users_select_own" ON public.mma_users 
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_update_own" ON public.mma_users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_admin_insert" ON public.mma_users 
    FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "users_admin_delete" ON public.mma_users 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_permission_areas (leitura para todos autenticados)
-- ============================================================
CREATE POLICY "areas_select" ON public.mma_permission_areas 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- POLICIES: mma_roles
-- ============================================================
CREATE POLICY "roles_select" ON public.mma_roles 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "roles_admin_insert" ON public.mma_roles 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "roles_admin_update" ON public.mma_roles 
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "roles_admin_delete" ON public.mma_roles 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_user_invites
-- ============================================================
CREATE POLICY "invites_admin_select" ON public.mma_user_invites 
    FOR SELECT USING (public.is_admin());

CREATE POLICY "invites_admin_insert" ON public.mma_user_invites 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "invites_admin_update" ON public.mma_user_invites 
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "invites_admin_delete" ON public.mma_user_invites 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_user_permissions
-- ============================================================
CREATE POLICY "permissions_admin_all" ON public.mma_user_permissions 
    FOR ALL USING (public.is_admin());

CREATE POLICY "permissions_select_own" ON public.mma_user_permissions 
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- POLICIES: mma_people
-- ============================================================
CREATE POLICY "people_select" ON public.mma_people 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('people', 'view'));

CREATE POLICY "people_insert" ON public.mma_people 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('people', 'edit'));

CREATE POLICY "people_update" ON public.mma_people 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('people', 'edit'));

CREATE POLICY "people_delete" ON public.mma_people 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_people_documents
-- ============================================================
CREATE POLICY "people_docs_select" ON public.mma_people_documents 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('people', 'view'));

CREATE POLICY "people_docs_insert" ON public.mma_people_documents 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('people', 'edit'));

CREATE POLICY "people_docs_update" ON public.mma_people_documents 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('people', 'edit'));

CREATE POLICY "people_docs_delete" ON public.mma_people_documents 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('people', 'edit'));

-- ============================================================
-- POLICIES: mma_events
-- ============================================================
CREATE POLICY "events_select" ON public.mma_events 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('events', 'view'));

CREATE POLICY "events_insert" ON public.mma_events 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "events_update" ON public.mma_events 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "events_delete" ON public.mma_events 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_event_checklist_items
-- ============================================================
CREATE POLICY "checklist_items_select" ON public.mma_event_checklist_items 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('events', 'view'));

CREATE POLICY "checklist_items_insert" ON public.mma_event_checklist_items 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "checklist_items_update" ON public.mma_event_checklist_items 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "checklist_items_delete" ON public.mma_event_checklist_items 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

-- ============================================================
-- POLICIES: mma_enrollments
-- ============================================================
CREATE POLICY "enrollments_select" ON public.mma_enrollments 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('events', 'view'));

CREATE POLICY "enrollments_insert" ON public.mma_enrollments 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "enrollments_update" ON public.mma_enrollments 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "enrollments_delete" ON public.mma_enrollments 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

-- ============================================================
-- POLICIES: mma_enrollment_corners
-- ============================================================
CREATE POLICY "enrollment_corners_select" ON public.mma_enrollment_corners 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('events', 'view'));

CREATE POLICY "enrollment_corners_insert" ON public.mma_enrollment_corners 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "enrollment_corners_update" ON public.mma_enrollment_corners 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

CREATE POLICY "enrollment_corners_delete" ON public.mma_enrollment_corners 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('events', 'edit'));

-- ============================================================
-- POLICIES: mma_flights
-- ============================================================
CREATE POLICY "flights_select" ON public.mma_flights 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('flights', 'view'));

CREATE POLICY "flights_insert" ON public.mma_flights 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('flights', 'edit'));

CREATE POLICY "flights_update" ON public.mma_flights 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('flights', 'edit'));

CREATE POLICY "flights_delete" ON public.mma_flights 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('flights', 'edit'));

-- ============================================================
-- POLICIES: mma_visas
-- ============================================================
CREATE POLICY "visas_select" ON public.mma_visas 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('visas', 'view'));

CREATE POLICY "visas_insert" ON public.mma_visas 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('visas', 'edit'));

CREATE POLICY "visas_update" ON public.mma_visas 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('visas', 'edit'));

CREATE POLICY "visas_delete" ON public.mma_visas 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('visas', 'edit'));

-- ============================================================
-- POLICIES: mma_hotels
-- ============================================================
CREATE POLICY "hotels_select" ON public.mma_hotels 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('hotels', 'view'));

CREATE POLICY "hotels_insert" ON public.mma_hotels 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('hotels', 'edit'));

CREATE POLICY "hotels_update" ON public.mma_hotels 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('hotels', 'edit'));

CREATE POLICY "hotels_delete" ON public.mma_hotels 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('hotels', 'edit'));

-- ============================================================
-- POLICIES: mma_transport_drivers
-- ============================================================
CREATE POLICY "drivers_select" ON public.mma_transport_drivers 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('transport', 'view'));

CREATE POLICY "drivers_insert" ON public.mma_transport_drivers 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "drivers_update" ON public.mma_transport_drivers 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "drivers_delete" ON public.mma_transport_drivers 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

-- ============================================================
-- POLICIES: mma_transport_cars
-- ============================================================
CREATE POLICY "cars_select" ON public.mma_transport_cars 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('transport', 'view'));

CREATE POLICY "cars_insert" ON public.mma_transport_cars 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "cars_update" ON public.mma_transport_cars 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "cars_delete" ON public.mma_transport_cars 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

-- ============================================================
-- POLICIES: mma_transport_passengers
-- ============================================================
CREATE POLICY "passengers_select" ON public.mma_transport_passengers 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('transport', 'view'));

CREATE POLICY "passengers_insert" ON public.mma_transport_passengers 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "passengers_update" ON public.mma_transport_passengers 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

CREATE POLICY "passengers_delete" ON public.mma_transport_passengers 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('transport', 'edit'));

-- ============================================================
-- POLICIES: mma_athlete_stats
-- ============================================================
CREATE POLICY "stats_select" ON public.mma_athlete_stats 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('operations', 'view'));

CREATE POLICY "stats_insert" ON public.mma_athlete_stats 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "stats_update" ON public.mma_athlete_stats 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "stats_delete" ON public.mma_athlete_stats 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

-- ============================================================
-- POLICIES: mma_athlete_music
-- ============================================================
CREATE POLICY "music_select" ON public.mma_athlete_music 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('operations', 'view'));

CREATE POLICY "music_insert" ON public.mma_athlete_music 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "music_update" ON public.mma_athlete_music 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "music_delete" ON public.mma_athlete_music 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

-- ============================================================
-- POLICIES: mma_athlete_tasks
-- ============================================================
CREATE POLICY "tasks_select" ON public.mma_athlete_tasks 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('operations', 'view'));

CREATE POLICY "tasks_insert" ON public.mma_athlete_tasks 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "tasks_update" ON public.mma_athlete_tasks 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

CREATE POLICY "tasks_delete" ON public.mma_athlete_tasks 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('operations', 'edit'));

-- ============================================================
-- POLICIES: mma_pre_event_checks
-- ============================================================
CREATE POLICY "pre_event_select" ON public.mma_pre_event_checks 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('pre_event', 'view'));

CREATE POLICY "pre_event_insert" ON public.mma_pre_event_checks 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "pre_event_update" ON public.mma_pre_event_checks 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "pre_event_delete" ON public.mma_pre_event_checks 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

-- ============================================================
-- POLICIES: mma_batches
-- ============================================================
CREATE POLICY "batches_select" ON public.mma_batches 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('pre_event', 'view'));

CREATE POLICY "batches_insert" ON public.mma_batches 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "batches_update" ON public.mma_batches 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "batches_delete" ON public.mma_batches 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

-- ============================================================
-- POLICIES: mma_batch_passengers
-- ============================================================
CREATE POLICY "batch_passengers_select" ON public.mma_batch_passengers 
    FOR SELECT USING (public.is_user_active() AND public.has_permission('pre_event', 'view'));

CREATE POLICY "batch_passengers_insert" ON public.mma_batch_passengers 
    FOR INSERT WITH CHECK (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "batch_passengers_update" ON public.mma_batch_passengers 
    FOR UPDATE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

CREATE POLICY "batch_passengers_delete" ON public.mma_batch_passengers 
    FOR DELETE USING (public.is_user_active() AND public.has_permission('pre_event', 'edit'));

-- ============================================================
-- POLICIES: mma_messages
-- ============================================================
CREATE POLICY "messages_select" ON public.mma_messages 
    FOR SELECT USING (public.is_user_active());

CREATE POLICY "messages_admin_insert" ON public.mma_messages 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "messages_admin_update" ON public.mma_messages 
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "messages_admin_delete" ON public.mma_messages 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_message_attachments
-- ============================================================
CREATE POLICY "attachments_select" ON public.mma_message_attachments 
    FOR SELECT USING (public.is_user_active());

CREATE POLICY "attachments_admin_insert" ON public.mma_message_attachments 
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "attachments_admin_update" ON public.mma_message_attachments 
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "attachments_admin_delete" ON public.mma_message_attachments 
    FOR DELETE USING (public.is_admin());

-- ============================================================
-- POLICIES: mma_message_reads
-- ============================================================
CREATE POLICY "reads_select" ON public.mma_message_reads 
    FOR SELECT USING (public.is_user_active());

CREATE POLICY "reads_insert" ON public.mma_message_reads 
    FOR INSERT WITH CHECK (public.is_user_active());

CREATE POLICY "reads_update" ON public.mma_message_reads 
    FOR UPDATE USING (public.is_user_active());

CREATE POLICY "reads_delete" ON public.mma_message_reads 
    FOR DELETE USING (public.is_user_active());


-- ============================================================
-- PARTE 12: VERIFICAÇÃO FINAL
-- ============================================================

DO $$
DECLARE
    tabelas_esperadas TEXT[] := ARRAY[
        'mma_users',
        'mma_user_invites',
        'mma_permission_areas',
        'mma_user_permissions',
        'mma_roles',
        'mma_people',
        'mma_people_documents',
        'mma_events',
        'mma_event_checklist_items',
        'mma_enrollments',
        'mma_enrollment_corners',
        'mma_flights',
        'mma_visas',
        'mma_hotels',
        'mma_transport_drivers',
        'mma_transport_cars',
        'mma_transport_passengers',
        'mma_athlete_stats',
        'mma_athlete_music',
        'mma_athlete_tasks',
        'mma_pre_event_checks',
        'mma_batches',
        'mma_batch_passengers',
        'mma_messages',
        'mma_message_attachments',
        'mma_message_reads'
    ];
    tabela TEXT;
    count_ok INTEGER := 0;
BEGIN
    FOREACH tabela IN ARRAY tabelas_esperadas LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tabela
        ) THEN
            count_ok := count_ok + 1;
        ELSE
            RAISE WARNING 'Tabela % não foi criada!', tabela;
        END IF;
    END LOOP;
    
    -- Verificar tabela de auditoria
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'app_private' AND table_name = 'mma_audit_logs'
    ) THEN
        count_ok := count_ok + 1;
    ELSE
        RAISE WARNING 'Tabela app_private.mma_audit_logs não foi criada!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ VERIFICAÇÃO CONCLUÍDA';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tabelas criadas: % de 27', count_ok;
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Configure as variáveis de ambiente no projeto';
    RAISE NOTICE '2. Execute: pnpm install';
    RAISE NOTICE '3. Execute: pnpm dev';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
END;

$$;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================