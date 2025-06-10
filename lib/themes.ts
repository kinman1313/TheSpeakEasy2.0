import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface Theme {
    id: string;
    name: string;
    colors: {
        '--background-start-rgb': string;
        '--background-end-rgb': string;
        '--foreground-rgb': string;
        '--primary-rgb': string;
        '--primary-foreground-rgb': string;
        '--secondary-rgb': string;
        '--secondary-foreground-rgb': string;
        '--accent-rgb': string;
        '--accent-foreground-rgb': string;
        '--glass-color-rgb': string;
        '--neon-glow-color': string;
    };
}

export const THEMES: Theme[] = [
    {
        id: 'default-dark',
        name: 'Default Dark',
        colors: {
            '--background-start-rgb': '15, 23, 42',
            '--background-end-rgb': '51, 65, 85',
            '--foreground-rgb': '229, 231, 235',
            '--primary-rgb': '34, 197, 94', // Neon Green
            '--primary-foreground-rgb': '255, 255, 255',
            '--secondary-rgb': '30, 41, 59',
            '--secondary-foreground-rgb': '229, 231, 235',
            '--accent-rgb': '59, 130, 246',
            '--accent-foreground-rgb': '255, 255, 255',
            '--glass-color-rgb': '30, 41, 59, 0.4',
            '--neon-glow-color': '34, 197, 94',
        },
    },
    {
        id: 'midnight-blue',
        name: 'Midnight Blue',
        colors: {
            '--background-start-rgb': '28, 25, 52',
            '--background-end-rgb': '17, 24, 39',
            '--foreground-rgb': '224, 231, 255',
            '--primary-rgb': '99, 102, 241', // Indigo
            '--primary-foreground-rgb': '255, 255, 255',
            '--secondary-rgb': '49, 46, 129',
            '--secondary-foreground-rgb': '224, 231, 255',
            '--accent-rgb': '234, 179, 8',
            '--accent-foreground-rgb': '23, 23, 23',
            '--glass-color-rgb': '49, 46, 129, 0.4',
            '--neon-glow-color': '99, 102, 241',
        },
    },
    {
        id: 'forest-green',
        name: 'Forest Green',
        colors: {
            '--background-start-rgb': '20, 33, 27',
            '--background-end-rgb': '26, 46, 53',
            '--foreground-rgb': '212, 227, 221',
            '--primary-rgb': '22, 163, 74', // Green
            '--primary-foreground-rgb': '255, 255, 255',
            '--secondary-rgb': '29, 78, 216',
            '--secondary-foreground-rgb': '212, 227, 221',
            '--accent-rgb': '217, 119, 6',
            '--accent-foreground-rgb': '255, 255, 255',
            '--glass-color-rgb': '26, 46, 53, 0.5',
            '--neon-glow-color': '22, 163, 74',
        },
    },
    {
        id: 'rose-gold',
        name: 'Rose Gold',
        colors: {
            '--background-start-rgb': '70, 27, 43',
            '--background-end-rgb': '90, 40, 50',
            '--foreground-rgb': '255, 228, 230',
            '--primary-rgb': '244, 114, 182', // Pink
            '--primary-foreground-rgb': '255, 255, 255',
            '--secondary-rgb': '157, 23, 77',
            '--secondary-foreground-rgb': '255, 228, 230',
            '--accent-rgb': '253, 224, 71',
            '--accent-foreground-rgb': '50, 20, 30',
            '--glass-color-rgb': '90, 40, 50, 0.5',
            '--neon-glow-color': '244, 114, 182',
        },
    },
];

export const ThemeService = {
    async getUserTheme(userId: string): Promise<string> {
        const userDocRef = doc(db, 'user_settings', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().themeId) {
            return userDoc.data().themeId;
        }
        return 'default-dark';
    },

    async setUserTheme(userId: string, themeId: string): Promise<void> {
        const userDocRef = doc(db, 'user_settings', userId);
        await setDoc(userDocRef, { themeId }, { merge: true });
    },
}; 