import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface Pattern {
    id: string;
    name: string;
    className: string; // CSS class for the pattern
    preview: string; // SVG or image data URI for preview
    configurable: boolean;
    defaultColor?: string;
    defaultScale?: number;
    defaultOpacity?: number;
}

export const PATTERNS: Pattern[] = [
    {
        id: 'none',
        name: 'None',
        className: '',
        preview: '',
        configurable: false
    },
    {
        id: 'subtle-dots',
        name: 'Subtle Dots',
        className: 'bg-[length:20px_20px] bg-center bg-repeat',
        preview: 'data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="1" fill="%23ccc" fill-opacity="0.2"/><circle cx="30" cy="10" r="1" fill="%23ccc" fill-opacity="0.2"/><circle cx="10" cy="30" r="1" fill="%23ccc" fill-opacity="0.2"/><circle cx="30" cy="30" r="1" fill="%23ccc" fill-opacity="0.2"/></svg>',
        configurable: true,
        defaultColor: '#cccccc',
        defaultScale: 20,
        defaultOpacity: 0.2
    },
    {
        id: 'retro-grid',
        name: 'Retro Grid',
        className: 'bg-[length:40px_40px] bg-center bg-repeat',
        preview: 'data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h40v40H0z" fill="none" stroke="%23fff" stroke-width="0.5"/><path d="M20 0v40M0 20h40" stroke="%23fff" stroke-width="0.5"/></svg>',
        configurable: true,
        defaultColor: '#ffffff',
        defaultScale: 40,
        defaultOpacity: 0.5
    },
    {
        id: 'diagonal-lines',
        name: 'Diagonal Lines',
        className: 'bg-[length:30px_30px] bg-center bg-repeat',
        preview: 'data:image/svg+xml;utf8,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M0,40L40,0" stroke="%23f472b6" stroke-width="1" stroke-opacity="0.3"/></svg>',
        configurable: true,
        defaultColor: '#f472b6',
        defaultScale: 30,
        defaultOpacity: 0.3
    },
    {
        id: 'hexagons',
        name: 'Hexagons',
        className: 'bg-[length:50px_50px] bg-center bg-repeat',
        preview: 'data:image/svg+xml;utf8,<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M25,0L50,15V35L25,50L0,35V15Z" fill="none" stroke="%23a78bfa" stroke-width="1" stroke-opacity="0.2"/></svg>',
        configurable: true,
        defaultColor: '#a78bfa',
        defaultScale: 50,
        defaultOpacity: 0.2
    },
    {
        id: 'noise',
        name: 'Noise Texture',
        className: 'bg-[length:200px_200px] bg-center bg-repeat opacity-30',
        preview: 'data:image/svg+xml;utf8,<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.3"/></svg>',
        configurable: false
    },
    {
        id: 'bubbles',
        name: 'Bubbles',
        className: 'bg-[length:100px_100px] bg-center bg-repeat',
        preview: 'data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="10" fill="%2338bdf8" fill-opacity="0.1"/><circle cx="75" cy="25" r="15" fill="%2338bdf8" fill-opacity="0.1"/><circle cx="50" cy="75" r="20" fill="%2338bdf8" fill-opacity="0.1"/></svg>',
        configurable: true,
        defaultColor: '#38bdf8',
        defaultScale: 100,
        defaultOpacity: 0.1
    }
];

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
    pattern?: string; // pattern id
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

export interface PatternConfig {
    color?: string;
    scale?: number;
    opacity?: number;
} 