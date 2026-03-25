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
  corner?: string | null;
  uniform_size?: string | null;
  shoe_size?: string | null;
  tshirt_size?: string | null;
  shorts_size?: string | null;
  jacket_size?: string | null;
  gloves_size?: string | null;
  coach1_size?: string | null;
  coach2_size?: string | null;
  coach3_size?: string | null;
  matchNumber?: number;

  
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
  residency?: string | null;
  weight_kg?: number | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  person?: {
    id: string;
    compiled_name: string;
    role?: string;
    nationality: string | null;
    fighter_id?: string | null;
    event_name?: string;
    passport_photo?: string | null;
  };
}

export interface FighterStatsFormData {
  height_cm?: number;
  reach_cm?: number;
  weight_class?: WeightClass;
  corner?: string;
  uniform_size?: string;
  shoe_size?: string;
  
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
  residency?: string;
  weight_kg?: number;
}

export interface CoachData {
  id: string;
  person_id: string;
  
  uniform_size: string | null;
  shoe_size: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  person?: {
    id: string;
    compiled_name: string;
    role?: string;
    nationality: string | null;
  };
}

export interface CoachDataFormData {
  uniform_size?: string;
  shoe_size?: string;
  height_cm?: number;
  weight_kg?: number;
}

// Event-specific weigh-in stats
export interface EventWeighIn {
  id: string;
  event_id: string;
  enrolled_id: string;
  corner: string | null;
  
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
      compiled_name: string;
      event_name?: string;
      fighter_id?: string | number | null;
    };
    stats?: FighterStats;
    corner?: string | null;
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
