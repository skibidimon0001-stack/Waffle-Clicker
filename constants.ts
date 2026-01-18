
import { Upgrade, Skin, Quest } from './types';

export const INITIAL_UPGRADES: Upgrade[] = [
  { id: 'better_batter', name: 'Better Batter', description: 'Makes waffles fluffier.', baseCost: 15, wps: 0.2, count: 0 },
  { id: 'golden_iron', name: 'Golden Iron', description: 'Heat conduction is superior.', baseCost: 100, wps: 1.5, count: 0 },
  { id: 'waffle_chef', name: 'Professional Chef', description: 'Bakes while you sleep.', baseCost: 1100, wps: 8, count: 0 },
  { id: 'waffle_factory', name: 'Waffle Factory', description: 'Mass production line.', baseCost: 12000, wps: 47, count: 0 },
  { id: 'syrup_river', name: 'Syrup River', description: 'Flowing sweetness.', baseCost: 130000, wps: 260, count: 0 },
  { id: 'waffle_dimension', name: 'Waffle Dimension', description: 'Tearing the fabric of reality.', baseCost: 1400000, wps: 1400, count: 0 },
];

export const INITIAL_QUESTS: Quest[] = [
  { id: 'click_100', text: 'Click 100 times', goal: 100, progress: 0, reward: 5, completed: false, type: 'clicks' },
  { id: 'earn_1000', text: 'Earn 1,000 Waffles', goal: 1000, progress: 0, reward: 10, completed: false, type: 'coins' },
  { id: 'wps_10', text: 'Reach 10 WPS', goal: 10, progress: 0, reward: 15, completed: false, type: 'wps' },
  { id: 'click_500', text: 'Click 500 times', goal: 500, progress: 0, reward: 20, completed: false, type: 'clicks' },
  { id: 'earn_100k', text: 'Earn 100,000 Waffles', goal: 100000, progress: 0, reward: 50, completed: false, type: 'coins' },
];

const EMOJIS = ['🧇', '🥞', '🥐', '🥯', '🍞', '🥨', '🍪', '🍩', '🥧', '🧁'];

export const generateSkins = (): Skin[] => {
  return Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Skin #${i + 1}`,
    cost: Math.floor(5 + i * 2.5),
    owned: false,
    multiplierBonus: 0.05,
    emoji: EMOJIS[i % EMOJIS.length]
  }));
};
