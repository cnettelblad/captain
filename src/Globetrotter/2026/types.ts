import { CategoryLetter, CategoryName } from '#captain/Globetrotter/2026/Categories.js';

export interface Challenge {
    id: string;
    name: string;
    points: number;
    repeatable: boolean;
}

export interface LogRow {
    date: string;
    challengeId: string;
    challengeName: string;
    points: number;
}

export interface CategoryRollup {
    letter: CategoryLetter;
    name: CategoryName;
    completed: number;
    total: number;
}

export interface RepeatableRow {
    id: string;
    name: string;
    count: number;
}

export type Rank = 'Gold' | 'Silver' | 'Bronze' | 'None';

export interface UserSummary {
    username: string;
    totalSubmissions: number;
    totalPoints: number;
    rank: Rank;
    nonRecurringCompleted: number;
    nonRecurringTotal: number;
    recurringSubmissions: number;
    repeatable: RepeatableRow[];
    categories: CategoryRollup[];
    log: LogRow[];
}
