export const CHALLENGE_CATEGORIES = {
    A: 'Recurring',
    B: 'Bonuses',
    C: 'Animals',
    D: 'Food and Drinks',
    E: 'Cities and Sightseeing',
    F: 'Nature and Geography',
    G: 'Ruins and Wonders',
    H: 'Adventure and Thrills',
    J: 'World Events and Culture',
    K: 'Icons and Architecture',
    L: 'Wanderlust',
    X: 'Special',
};
export const CATEGORY_ORDER = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'J',
    'K',
    'L',
    'X',
];
export function categoryFromChallengeId(challengeId) {
    const letter = challengeId.trim().charAt(0).toUpperCase();
    return letter in CHALLENGE_CATEGORIES ? letter : null;
}
