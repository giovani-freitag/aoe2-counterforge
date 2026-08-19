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
