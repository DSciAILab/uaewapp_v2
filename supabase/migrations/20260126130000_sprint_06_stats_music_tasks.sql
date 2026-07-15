-- Create mma_fighter_stats table
CREATE TABLE IF NOT EXISTS mma_fighter_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES mma_people(id) ON DELETE CASCADE,
    
    -- Physical Stats
    height_cm NUMERIC(5, 2),
    reach_cm NUMERIC(5, 2),
    weight_class TEXT,
    
    -- Record
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    no_contests INTEGER DEFAULT 0,
    
    -- Method Breakdown
    wins_ko INTEGER DEFAULT 0,
    wins_submission INTEGER DEFAULT 0,
    wins_decision INTEGER DEFAULT 0,
    
    losses_ko INTEGER DEFAULT 0,
    losses_submission INTEGER DEFAULT 0,
    losses_decision INTEGER DEFAULT 0,
    
    -- Info
    fighting_style TEXT,
    team_gym TEXT,
    nickname TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Separate Weigh-ins table per event
CREATE TABLE IF NOT EXISTS mma_event_weigh_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
    enrolled_id UUID NOT NULL REFERENCES mma_enrollments(id) ON DELETE CASCADE,
    
    official_weight_kg NUMERIC(5, 2),
    weigh_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    made_weight BOOLEAN DEFAULT false,
    weight_miss_kg NUMERIC(4, 2),
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entrance Music
CREATE TABLE IF NOT EXISTS mma_athlete_music (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
    enrolled_id UUID NOT NULL REFERENCES mma_enrollments(id) ON DELETE CASCADE,
    
    song_title TEXT NOT NULL,
    artist TEXT NOT NULL,
    
    source_type TEXT NOT NULL CHECK (source_type IN ('url', 'upload', 'spotify', 'youtube')),
    source_url TEXT,
    file_path TEXT,
    
    start_time_seconds INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'not_provided', 'uploaded')),
    walkout_order INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Templates (Reusable)
CREATE TABLE IF NOT EXISTS mma_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    default_priority TEXT NOT NULL DEFAULT 'medium',
    estimated_duration_minutes INTEGER,
    checklist_items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Tasks
CREATE TABLE IF NOT EXISTS mma_event_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
    template_id UUID REFERENCES mma_task_templates(id),
    
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'logistics', 'production', 'medical', 'security', 
        'media', 'hospitality', 'technical', 'administrative', 'other'
    )),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    assigned_to UUID REFERENCES auth.users(id),
    assigned_by UUID REFERENCES auth.users(id),
    
    due_date DATE,
    due_time TIME,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    checklist_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fighter_stats_person ON mma_fighter_stats(person_id);
CREATE INDEX idx_weigh_ins_event ON mma_event_weigh_ins(event_id);
CREATE INDEX idx_music_event ON mma_athlete_music(event_id);
CREATE INDEX idx_tasks_event ON mma_event_tasks(event_id);
CREATE INDEX idx_tasks_assigned_to ON mma_event_tasks(assigned_to);

-- RLS Policies
ALTER TABLE mma_fighter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mma_event_weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE mma_athlete_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE mma_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mma_event_tasks ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for now (authenticated users)
CREATE POLICY "Authenticated users can read fighter stats" ON mma_fighter_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fighter stats" ON mma_fighter_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fighter stats" ON mma_fighter_stats FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read weigh-ins" ON mma_event_weigh_ins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert weigh-ins" ON mma_event_weigh_ins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update weigh-ins" ON mma_event_weigh_ins FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read music" ON mma_athlete_music FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert music" ON mma_athlete_music FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update music" ON mma_athlete_music FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read task templates" ON mma_task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert task templates" ON mma_task_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update task templates" ON mma_task_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event tasks" ON mma_event_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event tasks" ON mma_event_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event tasks" ON mma_event_tasks FOR UPDATE TO authenticated USING (true);
