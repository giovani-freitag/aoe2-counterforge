import type { SVGProps } from 'react';
import {
    Castle,
    Crown,
    ChevronLeft,
    ChevronRight,
    Coins,
    Crosshair,
    Flame,
    Gauge,
    Gem,
    Hammer,
    Heart,
    House,
    Info,
    Monitor,
    Moon,
    Scale,
    Search,
    Shield,
    Sun,
    Sword,
    Swords,
    Target,
    Timer,
    TrendingUp,
    TreePine,
    Users,
    Wheat,
} from 'lucide-react';

/**
 * The GitHub mark, drawn by hand because the icon set carries no brand logos.
 *
 * @param props - Passed straight through, so it sizes and colours like any other glyph.
 * @returns The mark, filled with the surrounding text colour.
 */
function GitHubMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
    );
}

/**
 * Every glyph the interface is allowed to draw.
 *
 * Keeping the set in one place is what lets a stat, a resource or a tab be named rather than
 * decorated: the caller asks for "attack", not for a particular drawing.
 */
const GLYPHS = {
    age: Castle,
    armour: Shield,
    attack: Sword,
    civilizations: Castle,
    compare: Scale,
    food: Wheat,
    gold: Coins,
    hitPoints: Heart,
    home: House,
    lineOfSight: Target,
    next: ChevronRight,
    population: Users,
    range: Crosshair,
    search: Search,
    speed: Gauge,
    stone: Gem,
    strongAgainst: TrendingUp,
    trainTime: Timer,
    units: Swords,
    upgrades: Hammer,
    weakAgainst: Flame,
    wood: TreePine,
    about: Info,
    system: Monitor,
    light: Sun,
    dark: Moon,
    back: ChevronLeft,
    best: Crown,
    source: GitHubMark,
} as const;

export type IconName = keyof typeof GLYPHS;

export interface IconProps {
    name: IconName;
    className?: string;
}

/** Draws one interface glyph, inheriting the colour and size of the text around it. */
export function Icon({ name, className }: IconProps) {
    const Glyph = GLYPHS[name];

    return <Glyph className={['glyph', className].filter(Boolean).join(' ')} aria-hidden="true" focusable="false" />;
}
