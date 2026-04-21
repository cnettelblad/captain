export const CATEGORY_EMOJI = {
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
export const MEDAL_EMOJI = {
    Gold: '🥇',
    Silver: '🥈',
    Bronze: '🥉',
    None: '',
};
export const REPEATABLE_DISPLAY = {
    A1: { emoji: '🌍', label: (n) => `${n} ${n === 1 ? 'country' : 'countries'}` },
    A2: { emoji: '🗺️', label: (n) => `${n} ${n === 1 ? 'continent' : 'continents'}` },
    A3: { emoji: '📜', label: (n) => `${n} UNESCO ${n === 1 ? 'site' : 'sites'}` },
    A4: { emoji: '🤝', label: (n) => `${n} ${n === 1 ? 'Wanderluster' : 'Wanderlusters'} met` },
    A5: { emoji: '🌟', label: (n) => `${n} ${n === 1 ? 'Wonder' : 'Wonders'} of the World` },
};
