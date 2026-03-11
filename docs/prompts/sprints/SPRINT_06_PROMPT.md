# SPRINT 06: Stats + Music + Tasks Module

## 📋 Sprint Overview

**Sprint**: 06 - Stats + Music + Tasks
**Duration**: 2-3 days
**Dependencies**: Sprint 01 (People), Sprint 02 (Events + Enrolled)
**Objective**: Implement fighter statistics tracking, entrance music management, and operational task/checklist system

---

## 🎯 Sprint Goals

1. **Stats Module**
   - Fighter physical stats (weight, height, reach)
   - Fight record (wins, losses, draws, KOs, submissions)
   - Stats history per event
   - Weight class tracking

2. **Music Module**
   - Entrance music per fighter per event
   - Music file upload or URL reference
   - Playback order management
   - Music status (confirmed, pending, not provided)

3. **Tasks Module**
   - Operational task templates
   - Task assignment per event
   - Checklist functionality
   - Task status tracking and completion

---

## 📁 Files to Create

```
src/
├── lib/
│   └── services/
│       ├── stats-service.ts
│       ├── music-service.ts
│       └── task-service.ts
├── components/
│   ├── stats/
│   │   ├── stats-form.tsx
│   │   ├── stats-card.tsx
│   │   ├── stats-table.tsx
│   │   └── weight-class-badge.tsx
│   ├── music/
│   │   ├── music-form.tsx
│   │   ├── music-table.tsx
│   │   ├── music-player.tsx
│   │   └── music-status-badge.tsx
│   └── tasks/
│       ├── task-form.tsx
│       ├── task-table.tsx
│       ├── task-checklist.tsx
│       ├── task-template-form.tsx
│       └── task-status-badge.tsx
├── app/
│   └── (dashboard)/
│       └── events/
│           └── [eventId]/
│               ├── stats/
│               │   └── page.tsx
│               ├── music/
│               │   └── page.tsx
│               └── tasks/
│                   └── page.tsx
└── types/
    ├── stats.ts
    ├── music.ts
    └── task.ts
```

---

## 📝 Type Definitions

### File: `src/types/stats.ts`

```typescript
// Weight classes (UFC standard)
export type WeightClass = 
  | 'strawweight'      // 115 lbs / 52 kg
  | 'flyweight'        // 125 lbs / 57 kg
  | 'bantamweight'     // 135 lbs / 61 kg
  | 'featherweight'    // 145 lbs / 66 kg
  | 'lightweight'      // 155 lbs / 70 kg
  | 'welterweight'     // 170 lbs / 77 kg
  | 'middleweight'     // 185 lbs / 84 kg
  | 'light_heavyweight'// 205 lbs / 93 kg
  | 'heavyweight'      // 265 lbs / 120 kg
  | 'catch_weight';    // Custom weight

export interface FighterStats {
  id: string;
  person_id: string;
  
  // Physical stats
  height_cm: number | null;
  reach_cm: number | null;
  weight_class: WeightClass | null;
  
  // Fight record
  wins: number;
  losses: number;
  draws: number;
  no_contests: number;
  
  // Win methods
  wins_ko: number;
  wins_submission: number;
  wins_decision: number;
  
  // Loss methods
  losses_ko: number;
  losses_submission: number;
  losses_decision: number;
  
  // Additional info
  fighting_style: string | null;
  team_gym: string | null;
  nickname: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  person?: {
    id: string;
    full_name: string;
    role: string;
    nationality: string | null;
  };
}

export interface FighterStatsFormData {
  height_cm?: number;
  reach_cm?: number;
  weight_class?: WeightClass;
  wins: number;
  losses: number;
  draws: number;
  no_contests: number;
  wins_ko: number;
  wins_submission: number;
  wins_decision: number;
  losses_ko: number;
  losses_submission: number;
  losses_decision: number;
  fighting_style?: string;
  team_gym?: string;
  nickname?: string;
}

// Event-specific weigh-in stats
export interface EventWeighIn {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Weigh-in data
  official_weight_kg: number | null;
  weigh_in_time: string | null;
  made_weight: boolean;
  weight_miss_kg: number | null; // How much over if missed
  
  // Notes
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
    };
    stats?: FighterStats;
  };
}

export interface EventWeighInFormData {
  enrolled_id: string;
  official_weight_kg: number;
  weigh_in_time?: string;
  notes?: string;
}

export const WEIGHT_CLASS_LIMITS: Record<WeightClass, { lbs: number; kg: number }> = {
  strawweight: { lbs: 115, kg: 52.2 },
  flyweight: { lbs: 125, kg: 56.7 },
  bantamweight: { lbs: 135, kg: 61.2 },
  featherweight: { lbs: 145, kg: 65.8 },
  lightweight: { lbs: 155, kg: 70.3 },
  welterweight: { lbs: 170, kg: 77.1 },
  middleweight: { lbs: 185, kg: 83.9 },
  light_heavyweight: { lbs: 205, kg: 93.0 },
  heavyweight: { lbs: 265, kg: 120.2 },
  catch_weight: { lbs: 0, kg: 0 },
};

export const WEIGHT_CLASS_LABELS: Record<WeightClass, string> = {
  strawweight: 'Strawweight',
  flyweight: 'Flyweight',
  bantamweight: 'Bantamweight',
  featherweight: 'Featherweight',
  lightweight: 'Lightweight',
  welterweight: 'Welterweight',
  middleweight: 'Middleweight',
  light_heavyweight: 'Light Heavyweight',
  heavyweight: 'Heavyweight',
  catch_weight: 'Catch Weight',
};
```

### File: `src/types/music.ts`

```typescript
export type MusicStatus = 'pending' | 'confirmed' | 'not_provided' | 'uploaded';

export type MusicSource = 'url' | 'upload' | 'spotify' | 'youtube';

export interface EntranceMusic {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Music info
  song_title: string;
  artist: string;
  
  // Source
  source_type: MusicSource;
  source_url: string | null;       // URL for streaming services
  file_path: string | null;        // Path for uploaded files
  
  // Playback
  start_time_seconds: number;      // Where to start playing (default 0)
  duration_seconds: number | null; // How long to play
  
  // Status
  status: MusicStatus;
  
  // Order
  walkout_order: number | null;    // Order in the event
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface EntranceMusicFormData {
  enrolled_id: string;
  song_title: string;
  artist: string;
  source_type: MusicSource;
  source_url?: string;
  start_time_seconds: number;
  duration_seconds?: number;
  status: MusicStatus;
  walkout_order?: number;
  notes?: string;
}

export interface MusicFilters {
  status?: MusicStatus;
  search?: string;
}
```

### File: `src/types/task.ts`

```typescript
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskCategory = 
  | 'logistics'
  | 'production'
  | 'medical'
  | 'security'
  | 'media'
  | 'hospitality'
  | 'technical'
  | 'administrative'
  | 'other';

// Task templates (reusable across events)
export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TaskCategory;
  default_priority: TaskPriority;
  estimated_duration_minutes: number | null;
  checklist_items: string[]; // JSON array of checklist items
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateFormData {
  name: string;
  description?: string;
  category: TaskCategory;
  default_priority: TaskPriority;
  estimated_duration_minutes?: number;
  checklist_items: string[];
  is_active: boolean;
}

// Event-specific tasks
export interface EventTask {
  id: string;
  event_id: string;
  template_id: string | null;
  
  // Task info
  name: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Assignment
  assigned_to: string | null; // user_id
  assigned_by: string | null; // user_id
  
  // Timing
  due_date: string | null;
  due_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  
  // Checklist
  checklist_items: TaskChecklistItem[];
  
  // Notes
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  assigned_user?: {
    id: string;
    full_name: string;
  };
  template?: TaskTemplate;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export interface EventTaskFormData {
  template_id?: string;
  name: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  due_date?: string;
  due_time?: string;
  checklist_items: string[];
  notes?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigned_to?: string;
  search?: string;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  logistics: 'Logistics',
  production: 'Production',
  medical: 'Medical',
  security: 'Security',
  media: 'Media',
  hospitality: 'Hospitality',
  technical: 'Technical',
  administrative: 'Administrative',
  other: 'Other',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
```

---

## 🔧 Stats Service

### File: `src/lib/services/stats-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { FighterStats, FighterStatsFormData, EventWeighIn, EventWeighInFormData, WEIGHT_CLASS_LIMITS } from '@/types/stats';

const supabase = createClient();

// ==================== FIGHTER STATS ====================

export async function getFighterStats(personId: string): Promise<FighterStats | null> {
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name, role, nationality)
    `)
    .eq('person_id', personId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch fighter stats');
  }

  return data;
}

export async function getEventFighterStats(eventId: string): Promise<FighterStats[]> {
  // Get all fighters enrolled in event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select('person_id')
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const personIds = enrolled?.map(e => e.person_id) || [];
  
  if (personIds.length === 0) return [];

  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name, role, nationality)
    `)
    .in('person_id', personIds);

  if (error) throw new Error('Failed to fetch event fighter stats');

  return data || [];
}

export async function createFighterStats(personId: string, formData: FighterStatsFormData): Promise<FighterStats> {
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .insert({
      person_id: personId,
      height_cm: formData.height_cm || null,
      reach_cm: formData.reach_cm || null,
      weight_class: formData.weight_class || null,
      wins: formData.wins,
      losses: formData.losses,
      draws: formData.draws,
      no_contests: formData.no_contests,
      wins_ko: formData.wins_ko,
      wins_submission: formData.wins_submission,
      wins_decision: formData.wins_decision,
      losses_ko: formData.losses_ko,
      losses_submission: formData.losses_submission,
      losses_decision: formData.losses_decision,
      fighting_style: formData.fighting_style || null,
      team_gym: formData.team_gym || null,
      nickname: formData.nickname || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create fighter stats');

  return data;
}

export async function updateFighterStats(statsId: string, formData: Partial<FighterStatsFormData>): Promise<FighterStats> {
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .update(formData)
    .eq('id', statsId)
    .select()
    .single();

  if (error) throw new Error('Failed to update fighter stats');

  return data;
}

export async function upsertFighterStats(personId: string, formData: FighterStatsFormData): Promise<FighterStats> {
  const existing = await getFighterStats(personId);
  
  if (existing) {
    return updateFighterStats(existing.id, formData);
  } else {
    return createFighterStats(personId, formData);
  }
}

// ==================== EVENT WEIGH-INS ====================

export async function getEventWeighIns(eventId: string): Promise<EventWeighIn[]> {
  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name),
        person_id
      )
    `)
    .eq('event_id', eventId)
    .order('weigh_in_time', { ascending: true });

  if (error) throw new Error('Failed to fetch weigh-ins');

  // Get stats for each fighter
  const results = await Promise.all(
    (data || []).map(async (weighIn) => {
      const stats = await getFighterStats(weighIn.enrolled.person_id);
      return {
        ...weighIn,
        enrolled: {
          ...weighIn.enrolled,
          stats,
        },
      };
    })
  );

  return results;
}

export async function createWeighIn(eventId: string, formData: EventWeighInFormData): Promise<EventWeighIn> {
  // Get enrolled data to check weight class
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select('person_id')
    .eq('id', formData.enrolled_id)
    .single();

  if (enrolledError) throw new Error('Failed to fetch enrolled data');

  // Get fighter stats to determine if made weight
  const stats = await getFighterStats(enrolled.person_id);
  
  let madeWeight = true;
  let weightMissKg: number | null = null;

  if (stats?.weight_class && stats.weight_class !== 'catch_weight') {
    const limit = WEIGHT_CLASS_LIMITS[stats.weight_class].kg;
    if (formData.official_weight_kg > limit) {
      madeWeight = false;
      weightMissKg = formData.official_weight_kg - limit;
    }
  }

  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      official_weight_kg: formData.official_weight_kg,
      weigh_in_time: formData.weigh_in_time || new Date().toISOString(),
      made_weight: madeWeight,
      weight_miss_kg: weightMissKg,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create weigh-in');

  return data;
}

export async function updateWeighIn(weighInId: string, formData: Partial<EventWeighInFormData>): Promise<EventWeighIn> {
  const updateData: Record<string, unknown> = { ...formData };

  // Recalculate made_weight if weight changed
  if (formData.official_weight_kg !== undefined) {
    const { data: current } = await supabase
      .from('mma_event_weigh_ins')
      .select('enrolled:mma_enrolled!inner(person_id)')
      .eq('id', weighInId)
      .single();

    if (current) {
      const stats = await getFighterStats(current.enrolled.person_id);
      
      if (stats?.weight_class && stats.weight_class !== 'catch_weight') {
        const limit = WEIGHT_CLASS_LIMITS[stats.weight_class].kg;
        updateData.made_weight = formData.official_weight_kg <= limit;
        updateData.weight_miss_kg = formData.official_weight_kg > limit 
          ? formData.official_weight_kg - limit 
          : null;
      }
    }
  }

  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .update(updateData)
    .eq('id', weighInId)
    .select()
    .single();

  if (error) throw new Error('Failed to update weigh-in');

  return data;
}

export async function deleteWeighIn(weighInId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_event_weigh_ins')
    .delete()
    .eq('id', weighInId);

  if (error) throw new Error('Failed to delete weigh-in');
}

// ==================== UTILITIES ====================

export function calculateRecord(stats: FighterStats): string {
  return `${stats.wins}-${stats.losses}${stats.draws > 0 ? `-${stats.draws}` : ''}${stats.no_contests > 0 ? ` (${stats.no_contests} NC)` : ''}`;
}

export function formatHeight(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}" (${cm}cm)`;
}

export function formatReach(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${inches}" (${cm}cm)`;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}
```

---

## 🔧 Music Service

### File: `src/lib/services/music-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { EntranceMusic, EntranceMusicFormData, MusicFilters, MusicStatus } from '@/types/music';

const supabase = createClient();

export async function getEventMusic(eventId: string, filters?: MusicFilters): Promise<EntranceMusic[]> {
  let query = supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('walkout_order', { ascending: true, nullsFirst: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch entrance music');

  let results = data || [];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(music =>
      music.enrolled?.person?.full_name.toLowerCase().includes(searchLower) ||
      music.song_title.toLowerCase().includes(searchLower) ||
      music.artist.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getMusicById(musicId: string): Promise<EntranceMusic | null> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('id', musicId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch music');
  }

  return data;
}

export async function getMusicByEnrolledId(enrolledId: string): Promise<EntranceMusic | null> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select('*')
    .eq('enrolled_id', enrolledId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createMusic(eventId: string, formData: EntranceMusicFormData): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      song_title: formData.song_title,
      artist: formData.artist,
      source_type: formData.source_type,
      source_url: formData.source_url || null,
      file_path: null,
      start_time_seconds: formData.start_time_seconds,
      duration_seconds: formData.duration_seconds || null,
      status: formData.status,
      walkout_order: formData.walkout_order || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create entrance music');

  return data;
}

export async function updateMusic(musicId: string, formData: Partial<EntranceMusicFormData>): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update(formData)
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update entrance music');

  return data;
}

export async function deleteMusic(musicId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_entrance_music')
    .delete()
    .eq('id', musicId);

  if (error) throw new Error('Failed to delete entrance music');
}

export async function updateMusicStatus(musicId: string, status: MusicStatus): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update({ status })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update music status');

  return data;
}

export async function updateWalkoutOrder(musicId: string, order: number): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update({ walkout_order: order })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update walkout order');

  return data;
}

export async function reorderWalkouts(eventId: string, orderedIds: string[]): Promise<void> {
  // Update each music entry with new order
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('mma_entrance_music')
      .update({ walkout_order: index + 1 })
      .eq('id', id)
      .eq('event_id', eventId)
  );

  await Promise.all(updates);
}

export async function getEnrolledWithoutMusic(eventId: string): Promise<Array<{
  id: string;
  person: { id: string; full_name: string; role: string };
}>> {
  // Get all enrolled fighters for event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select(`
      id,
      person:mma_people!inner(id, full_name, role)
    `)
    .eq('event_id', eventId)
    .in('person.role', ['fighter', 'Fighter', 'FIGHTER']);

  if (enrolledError) throw enrolledError;

  // Get enrolled IDs that have music
  const { data: music, error: musicError } = await supabase
    .from('mma_entrance_music')
    .select('enrolled_id')
    .eq('event_id', eventId);

  if (musicError) throw musicError;

  const musicEnrolledIds = new Set(music?.map(m => m.enrolled_id) || []);

  return (enrolled || []).filter(e => !musicEnrolledIds.has(e.id));
}

export async function getMusicStats(eventId: string): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  not_provided: number;
  uploaded: number;
}> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select('status')
    .eq('event_id', eventId);

  if (error) throw error;

  const music = data || [];

  return {
    total: music.length,
    confirmed: music.filter(m => m.status === 'confirmed').length,
    pending: music.filter(m => m.status === 'pending').length,
    not_provided: music.filter(m => m.status === 'not_provided').length,
    uploaded: music.filter(m => m.status === 'uploaded').length,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseDuration(formatted: string): number {
  const parts = formatted.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(formatted) || 0;
}
```

---

## 🔧 Task Service

### File: `src/lib/services/task-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { TaskTemplate, TaskTemplateFormData, EventTask, EventTaskFormData, TaskFilters, TaskStatus, TaskChecklistItem } from '@/types/task';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();

// ==================== TASK TEMPLATES ====================

export async function getTaskTemplates(activeOnly: boolean = false): Promise<TaskTemplate[]> {
  let query = supabase
    .from('mma_task_templates')
    .select('*')
    .order('category')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch task templates');

  return data || [];
}

export async function getTaskTemplateById(templateId: string): Promise<TaskTemplate | null> {
  const { data, error } = await supabase
    .from('mma_task_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createTaskTemplate(formData: TaskTemplateFormData): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('mma_task_templates')
    .insert({
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      default_priority: formData.default_priority,
      estimated_duration_minutes: formData.estimated_duration_minutes || null,
      checklist_items: formData.checklist_items,
      is_active: formData.is_active,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create task template');

  return data;
}

export async function updateTaskTemplate(templateId: string, formData: Partial<TaskTemplateFormData>): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('mma_task_templates')
    .update(formData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw new Error('Failed to update task template');

  return data;
}

export async function deleteTaskTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_task_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) throw new Error('Failed to delete task template');
}

// ==================== EVENT TASKS ====================

export async function getEventTasks(eventId: string, filters?: TaskFilters): Promise<EventTask[]> {
  let query = supabase
    .from('mma_event_tasks')
    .select(`
      *,
      assigned_user:mma_users!mma_event_tasks_assigned_to_fkey(id, full_name),
      template:mma_task_templates(*)
    `)
    .eq('event_id', eventId)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch event tasks');

  let results = data || [];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(task =>
      task.name.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getTaskById(taskId: string): Promise<EventTask | null> {
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .select(`
      *,
      assigned_user:mma_users!mma_event_tasks_assigned_to_fkey(id, full_name),
      template:mma_task_templates(*)
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createEventTask(eventId: string, formData: EventTaskFormData, userId: string): Promise<EventTask> {
  // Convert checklist strings to checklist items
  const checklistItems: TaskChecklistItem[] = formData.checklist_items.map(text => ({
    id: uuidv4(),
    text,
    completed: false,
    completed_at: null,
    completed_by: null,
  }));

  const { data, error } = await supabase
    .from('mma_event_tasks')
    .insert({
      event_id: eventId,
      template_id: formData.template_id || null,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      assigned_by: formData.assigned_to ? userId : null,
      due_date: formData.due_date || null,
      due_time: formData.due_time || null,
      checklist_items: checklistItems,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create event task');

  return data;
}

export async function createTaskFromTemplate(eventId: string, templateId: string, userId: string, overrides?: Partial<EventTaskFormData>): Promise<EventTask> {
  const template = await getTaskTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const formData: EventTaskFormData = {
    template_id: templateId,
    name: overrides?.name || template.name,
    description: overrides?.description || template.description || undefined,
    category: overrides?.category || template.category,
    priority: overrides?.priority || template.default_priority,
    status: overrides?.status || 'pending',
    assigned_to: overrides?.assigned_to,
    due_date: overrides?.due_date,
    due_time: overrides?.due_time,
    checklist_items: overrides?.checklist_items || template.checklist_items,
    notes: overrides?.notes,
  };

  return createEventTask(eventId, formData, userId);
}

export async function updateEventTask(taskId: string, formData: Partial<EventTaskFormData>): Promise<EventTask> {
  const updateData: Record<string, unknown> = { ...formData };

  // Handle checklist items conversion if provided
  if (formData.checklist_items) {
    const current = await getTaskById(taskId);
    const existingItems = current?.checklist_items || [];
    
    // Preserve completed status for existing items
    updateData.checklist_items = formData.checklist_items.map(text => {
      const existing = existingItems.find(item => item.text === text);
      if (existing) return existing;
      return {
        id: uuidv4(),
        text,
        completed: false,
        completed_at: null,
        completed_by: null,
      };
    });
  }

  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to update event task');

  return data;
}

export async function deleteEventTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_event_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw new Error('Failed to delete event task');
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<EventTask> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to update task status');

  return data;
}

export async function toggleChecklistItem(taskId: string, itemId: string, userId: string): Promise<EventTask> {
  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const updatedItems = task.checklist_items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        completed: !item.completed,
        completed_at: !item.completed ? new Date().toISOString() : null,
        completed_by: !item.completed ? userId : null,
      };
    }
    return item;
  });

  // Check if all items are completed
  const allCompleted = updatedItems.every(item => item.completed);

  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update({ 
      checklist_items: updatedItems,
      status: allCompleted ? 'completed' : task.status,
      completed_at: allCompleted ? new Date().toISOString() : task.completed_at,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to toggle checklist item');

  return data;
}

export async function assignTask(taskId: string, assigneeId: string | null, assignerId: string): Promise<EventTask> {
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update({
      assigned_to: assigneeId,
      assigned_by: assigneeId ? assignerId : null,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to assign task');

  return data;
}

export async function getTaskStats(eventId: string): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  by_category: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .select('status, category, due_date')
    .eq('event_id', eventId);

  if (error) throw error;

  const tasks = data || [];
  const now = new Date();

  const byCategory: Record<string, number> = {};
  tasks.forEach(task => {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
  });

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => 
      t.status !== 'completed' && 
      t.status !== 'cancelled' && 
      t.due_date && 
      new Date(t.due_date) < now
    ).length,
    by_category: byCategory,
  };
}
```

---

## 🎨 Stats Components

### File: `src/components/stats/weight-class-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { WeightClass, WEIGHT_CLASS_LABELS, WEIGHT_CLASS_LIMITS } from '@/types/stats';

interface WeightClassBadgeProps {
  weightClass: WeightClass;
  showLimit?: boolean;
}

const weightClassColors: Record<WeightClass, string> = {
  strawweight: 'bg-pink-100 text-pink-800 border-pink-200',
  flyweight: 'bg-purple-100 text-purple-800 border-purple-200',
  bantamweight: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  featherweight: 'bg-blue-100 text-blue-800 border-blue-200',
  lightweight: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  welterweight: 'bg-teal-100 text-teal-800 border-teal-200',
  middleweight: 'bg-green-100 text-green-800 border-green-200',
  light_heavyweight: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  heavyweight: 'bg-orange-100 text-orange-800 border-orange-200',
  catch_weight: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function WeightClassBadge({ weightClass, showLimit = false }: WeightClassBadgeProps) {
  const label = WEIGHT_CLASS_LABELS[weightClass];
  const limit = WEIGHT_CLASS_LIMITS[weightClass];
  const colorClass = weightClassColors[weightClass];

  return (
    <Badge variant="outline" className={colorClass}>
      {label}
      {showLimit && weightClass !== 'catch_weight' && (
        <span className="ml-1 opacity-75">({limit.lbs} lbs)</span>
      )}
    </Badge>
  );
}
```

### File: `src/components/stats/stats-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FighterStats } from '@/types/stats';
import { WeightClassBadge } from './weight-class-badge';
import { calculateRecord, formatHeight, formatReach } from '@/lib/services/stats-service';
import { User, Ruler, Target, Trophy, Swords } from 'lucide-react';

interface StatsCardProps {
  stats: FighterStats;
  compact?: boolean;
}

export function StatsCard({ stats, compact = false }: StatsCardProps) {
  const record = calculateRecord(stats);
  const totalFights = stats.wins + stats.losses + stats.draws + stats.no_contests;

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 border rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{stats.person?.full_name}</span>
            {stats.nickname && (
              <span className="text-sm text-muted-foreground">"{stats.nickname}"</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{record}</Badge>
            {stats.weight_class && <WeightClassBadge weightClass={stats.weight_class} />}
          </div>
        </div>
        {stats.team_gym && (
          <span className="text-sm text-muted-foreground">{stats.team_gym}</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {stats.person?.full_name}
            {stats.nickname && (
              <span className="text-lg font-normal text-muted-foreground">
                "{stats.nickname}"
              </span>
            )}
          </CardTitle>
          {stats.weight_class && <WeightClassBadge weightClass={stats.weight_class} showLimit />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Physical Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.height_cm && (
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Height</p>
                <p className="font-medium">{formatHeight(stats.height_cm)}</p>
              </div>
            </div>
          )}
          {stats.reach_cm && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Reach</p>
                <p className="font-medium">{formatReach(stats.reach_cm)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Record */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Record: {record}</span>
            <span className="text-sm text-muted-foreground">({totalFights} fights)</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Wins ({stats.wins})</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>KO/TKO</span>
                  <span className="font-medium">{stats.wins_ko}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submission</span>
                  <span className="font-medium">{stats.wins_submission}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decision</span>
                  <span className="font-medium">{stats.wins_decision}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Losses ({stats.losses})</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>KO/TKO</span>
                  <span className="font-medium">{stats.losses_ko}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submission</span>
                  <span className="font-medium">{stats.losses_submission}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decision</span>
                  <span className="font-medium">{stats.losses_decision}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(stats.fighting_style || stats.team_gym) && (
          <div className="border-t pt-4 space-y-2">
            {stats.fighting_style && (
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{stats.fighting_style}</span>
              </div>
            )}
            {stats.team_gym && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Team:</span>
                <span className="text-sm">{stats.team_gym}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/stats/stats-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FighterStats, FighterStatsFormData, WeightClass, WEIGHT_CLASS_LABELS } from '@/types/stats';
import { upsertFighterStats } from '@/lib/services/stats-service';
import { toast } from 'sonner';

const statsSchema = z.object({
  height_cm: z.coerce.number().min(100).max(250).optional(),
  reach_cm: z.coerce.number().min(100).max(250).optional(),
  weight_class: z.string().optional(),
  wins: z.coerce.number().min(0),
  losses: z.coerce.number().min(0),
  draws: z.coerce.number().min(0),
  no_contests: z.coerce.number().min(0),
  wins_ko: z.coerce.number().min(0),
  wins_submission: z.coerce.number().min(0),
  wins_decision: z.coerce.number().min(0),
  losses_ko: z.coerce.number().min(0),
  losses_submission: z.coerce.number().min(0),
  losses_decision: z.coerce.number().min(0),
  fighting_style: z.string().optional(),
  team_gym: z.string().optional(),
  nickname: z.string().optional(),
});

interface StatsFormProps {
  personId: string;
  personName: string;
  stats?: FighterStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StatsForm({ personId, personName, stats, open, onOpenChange, onSuccess }: StatsFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FighterStatsFormData>({
    resolver: zodResolver(statsSchema),
    defaultValues: {
      height_cm: undefined,
      reach_cm: undefined,
      weight_class: undefined,
      wins: 0,
      losses: 0,
      draws: 0,
      no_contests: 0,
      wins_ko: 0,
      wins_submission: 0,
      wins_decision: 0,
      losses_ko: 0,
      losses_submission: 0,
      losses_decision: 0,
      fighting_style: '',
      team_gym: '',
      nickname: '',
    },
  });

  useEffect(() => {
    if (stats) {
      form.reset({
        height_cm: stats.height_cm || undefined,
        reach_cm: stats.reach_cm || undefined,
        weight_class: stats.weight_class || undefined,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        no_contests: stats.no_contests,
        wins_ko: stats.wins_ko,
        wins_submission: stats.wins_submission,
        wins_decision: stats.wins_decision,
        losses_ko: stats.losses_ko,
        losses_submission: stats.losses_submission,
        losses_decision: stats.losses_decision,
        fighting_style: stats.fighting_style || '',
        team_gym: stats.team_gym || '',
        nickname: stats.nickname || '',
      });
    }
  }, [stats, form]);

  // Auto-calculate totals
  const wins = form.watch('wins');
  const winsKo = form.watch('wins_ko');
  const winsSub = form.watch('wins_submission');
  const winsDec = form.watch('wins_decision');

  useEffect(() => {
    const methodsTotal = (winsKo || 0) + (winsSub || 0) + (winsDec || 0);
    if (methodsTotal > (wins || 0)) {
      form.setValue('wins', methodsTotal);
    }
  }, [winsKo, winsSub, winsDec, wins, form]);

  const onSubmit = async (data: FighterStatsFormData) => {
    setIsLoading(true);
    try {
      await upsertFighterStats(personId, data);
      toast.success('Fighter stats saved');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save fighter stats');
    } finally {
      setIsLoading(false);
    }
  };

  const weightClasses = Object.entries(WEIGHT_CLASS_LABELS) as [WeightClass, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fighter Stats - {personName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl><Input placeholder="e.g., The Notorious" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {weightClasses.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Physical Stats */}
            <div className="space-y-4">
              <h3 className="font-medium">Physical Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" placeholder="175" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reach_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reach (cm)</FormLabel>
                      <FormControl><Input type="number" placeholder="180" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fight Record */}
            <div className="space-y-4">
              <h3 className="font-medium">Fight Record</h3>
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="wins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wins</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Losses</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="draws"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Draws</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no_contests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NC</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Win Methods */}
            <div className="space-y-4">
              <h3 className="font-medium">Win Methods</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="wins_ko"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KO/TKO</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wins_submission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wins_decision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Loss Methods */}
            <div className="space-y-4">
              <h3 className="font-medium">Loss Methods</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="losses_ko"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KO/TKO</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses_submission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses_decision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Additional Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fighting_style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fighting Style</FormLabel>
                      <FormControl><Input placeholder="e.g., Boxing, Wrestling, BJJ" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_gym"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team/Gym</FormLabel>
                      <FormControl><Input placeholder="e.g., American Top Team" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Stats'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/stats/stats-table.tsx`

```typescript
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { FighterStats } from '@/types/stats';
import { WeightClassBadge } from './weight-class-badge';
import { calculateRecord, formatHeight, formatReach } from '@/lib/services/stats-service';

interface StatsTableProps {
  stats: FighterStats[];
  onEdit: (stats: FighterStats) => void;
}

export function StatsTable({ stats, onEdit }: StatsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fighter</TableHead>
            <TableHead>Nickname</TableHead>
            <TableHead>Weight Class</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Height</TableHead>
            <TableHead>Reach</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No fighter stats found
              </TableCell>
            </TableRow>
          ) : (
            stats.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.person?.full_name}</TableCell>
                <TableCell>
                  {s.nickname ? (
                    <span className="text-muted-foreground">"{s.nickname}"</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {s.weight_class ? (
                    <WeightClassBadge weightClass={s.weight_class} />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{calculateRecord(s)}</Badge>
                </TableCell>
                <TableCell>{s.height_cm ? formatHeight(s.height_cm) : '-'}</TableCell>
                <TableCell>{s.reach_cm ? formatReach(s.reach_cm) : '-'}</TableCell>
                <TableCell>{s.team_gym || '-'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 🎨 Music Components

### File: `src/components/music/music-status-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { MusicStatus } from '@/types/music';
import { CheckCircle, Clock, XCircle, Upload } from 'lucide-react';

interface MusicStatusBadgeProps {
  status: MusicStatus;
}

const statusConfig: Record<MusicStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  not_provided: {
    label: 'Not Provided',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  uploaded: {
    label: 'Uploaded',
    icon: Upload,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function MusicStatusBadge({ status }: MusicStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

### File: `src/components/music/music-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EntranceMusic, EntranceMusicFormData, MusicStatus, MusicSource } from '@/types/music';
import { createMusic, updateMusic, getEnrolledWithoutMusic } from '@/lib/services/music-service';
import { toast } from 'sonner';

const musicSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a fighter'),
  song_title: z.string().min(1, 'Song title is required'),
  artist: z.string().min(1, 'Artist is required'),
  source_type: z.enum(['url', 'upload', 'spotify', 'youtube']),
  source_url: z.string().optional(),
  start_time_seconds: z.coerce.number().min(0),
  duration_seconds: z.coerce.number().min(1).optional(),
  status: z.enum(['pending', 'confirmed', 'not_provided', 'uploaded']),
  walkout_order: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
});

interface MusicFormProps {
  eventId: string;
  music?: EntranceMusic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MusicForm({ eventId, music, open, onOpenChange, onSuccess }: MusicFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableEnrolled, setAvailableEnrolled] = useState<Array<{
    id: string;
    person: { id: string; full_name: string; role: string };
  }>>([]);

  const isEditing = !!music;

  const form = useForm<EntranceMusicFormData>({
    resolver: zodResolver(musicSchema),
    defaultValues: {
      enrolled_id: '',
      song_title: '',
      artist: '',
      source_type: 'url',
      source_url: '',
      start_time_seconds: 0,
      duration_seconds: undefined,
      status: 'pending',
      walkout_order: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (open && !isEditing) {
      getEnrolledWithoutMusic(eventId).then(setAvailableEnrolled).catch(console.error);
    }
  }, [open, eventId, isEditing]);

  useEffect(() => {
    if (music) {
      form.reset({
        enrolled_id: music.enrolled_id,
        song_title: music.song_title,
        artist: music.artist,
        source_type: music.source_type,
        source_url: music.source_url || '',
        start_time_seconds: music.start_time_seconds,
        duration_seconds: music.duration_seconds || undefined,
        status: music.status,
        walkout_order: music.walkout_order || undefined,
        notes: music.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        song_title: '',
        artist: '',
        source_type: 'url',
        source_url: '',
        start_time_seconds: 0,
        duration_seconds: undefined,
        status: 'pending',
        walkout_order: undefined,
        notes: '',
      });
    }
  }, [music, form]);

  const onSubmit = async (data: EntranceMusicFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateMusic(music.id, data);
        toast.success('Music updated');
      } else {
        await createMusic(eventId, data);
        toast.success('Music added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update music' : 'Failed to add music');
    } finally {
      setIsLoading(false);
    }
  };

  const sourceTypes: { value: MusicSource; label: string }[] = [
    { value: 'url', label: 'URL Link' },
    { value: 'spotify', label: 'Spotify' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'upload', label: 'File Upload' },
  ];

  const statusOptions: { value: MusicStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'not_provided', label: 'Not Provided' },
    { value: 'uploaded', label: 'Uploaded' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Entrance Music' : 'Add Entrance Music'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="enrolled_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fighter *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select fighter" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableEnrolled.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.person.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="song_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Song Title *</FormLabel>
                    <FormControl><Input placeholder="Enter song title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist *</FormLabel>
                    <FormControl><Input placeholder="Enter artist name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormDescription>Link to the music (Spotify, YouTube, etc.)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="start_time_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (sec)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (sec)</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="Auto" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walkout_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Walkout Order</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="#" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Music'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/music/music-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, ExternalLink } from 'lucide-react';
import { EntranceMusic, MusicStatus } from '@/types/music';
import { MusicStatusBadge } from './music-status-badge';
import { deleteMusic, updateMusicStatus, formatDuration } from '@/lib/services/music-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MusicTableProps {
  music: EntranceMusic[];
  onEdit: (music: EntranceMusic) => void;
  onRefresh: () => void;
}

export function MusicTable({ music, onEdit, onRefresh }: MusicTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteMusic(deleteId);
      toast.success('Music deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete music');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (musicId: string, status: MusicStatus) => {
    try {
      await updateMusicStatus(musicId, status);
      toast.success('Status updated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead>Fighter</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {music.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No entrance music found
                </TableCell>
              </TableRow>
            ) : (
              music.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono">
                    {m.walkout_order ? `#${m.walkout_order}` : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{m.enrolled?.person?.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{m.song_title}</span>
                      {m.source_url && (
                        <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{m.artist}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatDuration(m.start_time_seconds)}</Badge>
                  </TableCell>
                  <TableCell><MusicStatusBadge status={m.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(m)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        {m.source_url && (
                          <DropdownMenuItem asChild>
                            <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                              <Play className="mr-2 h-4 w-4" />Preview
                            </a>
                          </DropdownMenuItem>
                        )}
                        {m.status !== 'confirmed' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(m.id, 'confirmed')}>
                            Mark Confirmed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(m.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Music?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## 🎨 Task Components

### File: `src/components/tasks/task-status-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { Clock, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { icon: typeof Clock; className: string }> = {
  pending: { icon: Clock, className: 'bg-gray-100 text-gray-800 border-gray-200' },
  in_progress: { icon: Play, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityConfig: Record<TaskPriority, { className: string }> = {
  low: { className: 'bg-slate-100 text-slate-800 border-slate-200' },
  medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgent: { className: 'bg-red-100 text-red-800 border-red-200' },
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
```

### File: `src/components/tasks/task-checklist.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskChecklistItem } from '@/types/task';
import { toggleChecklistItem } from '@/lib/services/task-service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskChecklistProps {
  taskId: string;
  items: TaskChecklistItem[];
  onUpdate: () => void;
  readonly?: boolean;
}

export function TaskChecklist({ taskId, items, onUpdate, readonly = false }: TaskChecklistProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleToggle = async (itemId: string) => {
    if (readonly || !user?.id) return;

    setLoadingId(itemId);
    try {
      await toggleChecklistItem(taskId, itemId, user.id);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update checklist');
    } finally {
      setLoadingId(null);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span>{completedCount} / {items.length} completed</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2 rounded-lg border ${
              item.completed ? 'bg-muted/50' : 'bg-background'
            }`}
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => handleToggle(item.id)}
              disabled={readonly || loadingId === item.id}
              className="mt-0.5"
            />
            <div className="flex-1">
              <p className={item.completed ? 'line-through text-muted-foreground' : ''}>
                {item.text}
              </p>
              {item.completed && item.completed_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {format(new Date(item.completed_at), 'MMM dd, HH:mm')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### File: `src/components/tasks/task-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { EventTask, EventTaskFormData, TaskCategory, TaskPriority, TaskStatus, TASK_CATEGORY_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/types/task';
import { createEventTask, updateEventTask, getTaskTemplates } from '@/lib/services/task-service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

const taskSchema = z.object({
  template_id: z.string().optional(),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  category: z.enum(['logistics', 'production', 'medical', 'security', 'media', 'hospitality', 'technical', 'administrative', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  checklist_items: z.array(z.string()),
  notes: z.string().optional(),
});

interface TaskFormProps {
  eventId: string;
  task?: EventTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TaskForm({ eventId, task, open, onOpenChange, onSuccess }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const { user } = useAuth();
  const isEditing = !!task;

  const form = useForm<EventTaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      template_id: '',
      name: '',
      description: '',
      category: 'logistics',
      priority: 'medium',
      status: 'pending',
      assigned_to: '',
      due_date: '',
      due_time: '',
      checklist_items: [],
      notes: '',
    },
  });

  const checklistItems = form.watch('checklist_items');

  useEffect(() => {
    if (task) {
      form.reset({
        template_id: task.template_id || '',
        name: task.name,
        description: task.description || '',
        category: task.category,
        priority: task.priority,
        status: task.status,
        assigned_to: task.assigned_to || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        checklist_items: task.checklist_items.map(item => item.text),
        notes: task.notes || '',
      });
    } else {
      form.reset({
        template_id: '',
        name: '',
        description: '',
        category: 'logistics',
        priority: 'medium',
        status: 'pending',
        assigned_to: '',
        due_date: '',
        due_time: '',
        checklist_items: [],
        notes: '',
      });
    }
  }, [task, form]);

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      form.setValue('checklist_items', [...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    form.setValue('checklist_items', checklistItems.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: EventTaskFormData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      if (isEditing) {
        await updateEventTask(task.id, data);
        toast.success('Task updated');
      } else {
        await createEventTask(eventId, data, user.id);
        toast.success('Task created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update task' : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Object.entries(TASK_CATEGORY_LABELS) as [TaskCategory, string][];
  const priorities = Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][];
  const statuses = Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl><Input placeholder="Enter task name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Task description..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {priorities.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statuses.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <FormLabel>Checklist Items</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add checklist item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
                <Button type="button" variant="outline" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="flex-1">{item}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/tasks/task-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { EventTask, TaskStatus, TASK_CATEGORY_LABELS } from '@/types/task';
import { TaskStatusBadge, TaskPriorityBadge } from './task-status-badge';
import { deleteEventTask, updateTaskStatus } from '@/lib/services/task-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface TaskTableProps {
  tasks: EventTask[];
  onEdit: (task: EventTask) => void;
  onRefresh: () => void;
}

export function TaskTable({ tasks, onEdit, onRefresh }: TaskTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteEventTask(deleteId);
      toast.success('Task deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
      toast.success('Status updated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const completedItems = task.checklist_items.filter(i => i.completed).length;
                const totalItems = task.checklist_items.length;
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

                return (
                  <TableRow key={task.id} className={isOverdue ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.name}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TASK_CATEGORY_LABELS[task.category]}</Badge>
                    </TableCell>
                    <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                    <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <div className={isOverdue ? 'text-red-600' : ''}>
                          <p>{format(new Date(task.due_date), 'MMM dd')}</p>
                          {task.due_time && <p className="text-sm">{task.due_time}</p>}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {totalItems > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${(completedItems / totalItems) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{completedItems}/{totalItems}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {task.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                              <Play className="mr-2 h-4 w-4" />Start
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />Complete
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(task.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## 📄 Pages

### File: `src/app/(dashboard)/events/[eventId]/stats/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Scale, Users } from 'lucide-react';
import { StatsTable } from '@/components/stats/stats-table';
import { StatsForm } from '@/components/stats/stats-form';
import { StatsCard } from '@/components/stats/stats-card';
import { FighterStats } from '@/types/stats';
import { getEventFighterStats } from '@/lib/services/stats-service';

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [stats, setStats] = useState<FighterStats[]>([]);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventFighterStats(eventId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (s: FighterStats) => {
    setEditingStats(s);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingStats(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fighter Stats</h1>
          <p className="text-muted-foreground">Manage fighter statistics and records</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : viewMode === 'table' ? (
        <StatsTable stats={stats} onEdit={handleEdit} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.id} className="cursor-pointer" onClick={() => handleEdit(s)}>
              <StatsCard stats={s} />
            </div>
          ))}
        </div>
      )}

      {editingStats && (
        <StatsForm
          personId={editingStats.person_id}
          personName={editingStats.person?.full_name || ''}
          stats={editingStats}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
```

### File: `src/app/(dashboard)/events/[eventId]/music/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Music, CheckCircle, Clock, XCircle } from 'lucide-react';
import { MusicTable } from '@/components/music/music-table';
import { MusicForm } from '@/components/music/music-form';
import { EntranceMusic, MusicFilters } from '@/types/music';
import { getEventMusic, getMusicStats } from '@/lib/services/music-service';

export default function MusicPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [music, setMusic] = useState<EntranceMusic[]>([]);
  const [editingMusic, setEditingMusic] = useState<EntranceMusic | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, not_provided: 0, uploaded: 0 });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [musicData, statsData] = await Promise.all([
        getEventMusic(eventId),
        getMusicStats(eventId),
      ]);
      setMusic(musicData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load music:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (m: EntranceMusic) => {
    setEditingMusic(m);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMusic(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrance Music</h1>
          <p className="text-muted-foreground">Manage fighter walkout music</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Music
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Provided</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-600" />
              <span className="text-2xl font-bold">{stats.not_provided}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <MusicTable music={music} onEdit={handleEdit} onRefresh={loadData} />
      )}

      <MusicForm
        eventId={eventId}
        music={editingMusic}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />
    </div>
  );
}
```

### File: `src/app/(dashboard)/events/[eventId]/tasks/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ListTodo, Clock, Play, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { TaskTable } from '@/components/tasks/task-table';
import { TaskForm } from '@/components/tasks/task-form';
import { EventTask, TaskFilters, TaskStatus, TaskPriority, TaskCategory, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_CATEGORY_LABELS } from '@/types/task';
import { getEventTasks, getTaskStats } from '@/lib/services/task-service';

export default function TasksPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, by_category: {} as Record<string, number> });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, statsData] = await Promise.all([
        getEventTasks(eventId, filters),
        getTaskStats(eventId),
      ]);
      setTasks(tasksData);
      setStats(statsData);
    } catch (error) {