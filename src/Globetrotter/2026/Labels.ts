import { CategoryLetter } from '#captain/Globetrotter/2026/Categories.js';
import { Rank } from '#captain/Globetrotter/2026/types.js';

export const CATEGORY_EMOJI: Record<CategoryLetter, string> = {
    A: '🔁',
    B: '🎁',
    C: '🦁',
    D: '🍽️',
    E: '🏙️',
    F: '🏔️',
    G: '🏛️',
    H: '🎢',
    J: '🎭',
    K: '🗼',
    L: '🧳',
    X: '⭐',
};

export const MEDAL_EMOJI: Record<Rank, string> = {
    Gold: '🥇',
    Silver: '🥈',
    Bronze: '🥉',
    None: '',
};

export interface RepeatableDisplay {
    emoji: string;
    label: (count: number) => string;
}

export const REPEATABLE_DISPLAY: Record<string, RepeatableDisplay> = {
    A1: { emoji: '🌍', label: (n) => `${n} ${n === 1 ? 'country' : 'countries'}` },
    A2: { emoji: '🗺️', label: (n) => `${n} ${n === 1 ? 'continent' : 'continents'}` },
    A3: { emoji: '📜', label: (n) => `${n} UNESCO ${n === 1 ? 'site' : 'sites'}` },
    A4: { emoji: '🤝', label: (n) => `${n} ${n === 1 ? 'Wanderluster' : 'Wanderlusters'} met` },
    A5: { emoji: '🌟', label: (n) => `${n} ${n === 1 ? 'Wonder' : 'Wonders'} of the World` },
};
