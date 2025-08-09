export interface User {
    uid: string;
    email: string;
    name?: string;
    age?: string;
    address?: string;
    profilePic?: string;
    pollsVoted?: number;
    pollsCreated?: number;
}

export interface Poll {
    id: string;
    title: string;
    description: string;
    options: PollOption[];
    createdBy: string;
    createdAt: Date;
    totalVotes: number;
    image?: string;
    category: PollCategory;
}

export interface PollOption {
    id: string;
    text: string;
    votes: number;
}

export interface Vote {
    pollId: string;
    optionId: string;
    userId: string;
    timestamp: Date;
}

export interface Voter {
    id: string;
    name: string;
    avatar: string;
}

export interface VoteData {
    [pollId: string]: {
        [optionId: string]: {
            count: number;
            voters: string[];
        }
    }
}

export interface EditProfileData {
    name: string;
    age: string;
    address: string;
}


export enum PollCategory {
    POLITICS = 'politics',
    SPORTS = 'sports',
    ENTERTAINMENT = 'entertainment',
    OTHER = 'other'
}

export interface CategoryOption {
    id: PollCategory;
    label: string;
    icon: string;
    color: string;
}

export const POLL_CATEGORIES: CategoryOption[] = [
    { id: PollCategory.POLITICS, label: 'Politics', icon: 'flag-outline', color: '#e74c3c' },
    { id: PollCategory.SPORTS, label: 'Sports', icon: 'basketball-outline', color: '#f39c12' },
    { id: PollCategory.ENTERTAINMENT, label: 'Entertainment', icon: 'musical-notes-outline', color: '#9b59b6' },
    { id: PollCategory.OTHER, label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#95a5a6' },
];