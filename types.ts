
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  wps: number;
  count: number;
}

export interface Skin {
  id: number;
  name: string;
  cost: number;
  owned: boolean;
  multiplierBonus: number;
  emoji: string;
}

export interface Quest {
  id: string;
  text: string;
  goal: number;
  progress: number;
  reward: number;
  completed: boolean;
  type: 'clicks' | 'coins' | 'wps';
}

export interface Boss {
  name: string;
  target: number;
  timeLeft: number;
  maxTime: number;
  active: boolean;
  reward: number;
  level: number;
}
