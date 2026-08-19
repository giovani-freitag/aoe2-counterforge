import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import { iconUrl } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';

export interface UnitLineDiagramProps {
    /** One entry per upgrade step, each holding the alternatives at that point. */
    steps: readonly (readonly Unit[])[];
    current: Unit;
}

const NODE_HEIGHT = 52;
const ROW_GAP = 14;
const COLUMN_GAP = 44;
const PADDING = 6;
const ICON_SIZE = 32;
const LABEL_LEFT = ICON_SIZE + 22;

/** Rough advance width of the label font, enough to size a box around a unit name. */
const CHARACTER_WIDTH = 7.4;
const MIN_NODE_WIDTH = 150;
const MAX_NODE_WIDTH = 280;

interface PlacedNode {
    unit: Unit;
    name: string;
    x: number;
    y: number;
}

/**
 * The upgrade line drawn as a diagram: a box per unit, an arrow per upgrade.
 *
 * A line is not always a chain. The Cavalier is replaced by the Paladin or by the Savar, never by
 * both, and a fork is the one shape that says so without a sentence.
 */
export function UnitLineDiagram({ steps, current }: UnitLineDiagramProps) {
    const { t } = useTranslation();
    const text = useGameText();

    const names = new Map(steps.flat().map((unit) => [unit.key, text.unit(unit.key).name]));
    const longest = Math.max(...[...names.values()].map((name) => name.length));
    const nodeWidth = Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, LABEL_LEFT + longest * CHARACTER_WIDTH + 18));

    const rows = Math.max(...steps.map((step) => step.length));
    const height = PADDING * 2 + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP;
    const width = PADDING * 2 + steps.length * nodeWidth + (steps.length - 1) * COLUMN_GAP;

    const placed = new Map<string, PlacedNode>();
    steps.forEach((step, column) => {
        const columnHeight = step.length * NODE_HEIGHT + (step.length - 1) * ROW_GAP;
        step.forEach((unit, row) => {
            placed.set(unit.key, {
                unit,
                name: names.get(unit.key) ?? unit.key,
                x: PADDING + column * (nodeWidth + COLUMN_GAP),
                y: (height - columnHeight) / 2 + row * (NODE_HEIGHT + ROW_GAP),
            });
        });
    });

    const edges = [...placed.values()].flatMap((node) => {
        const parent = node.unit.upgradesFrom === null ? undefined : placed.get(node.unit.upgradesFrom);
        if (!parent) return [];

        const startX = parent.x + nodeWidth;
        const startY = parent.y + NODE_HEIGHT / 2;
        const endY = node.y + NODE_HEIGHT / 2;
        const bend = COLUMN_GAP * 0.6;

        return [
            {
                key: `${parent.unit.key}-${node.unit.key}`,
                path: `M ${String(startX)} ${String(startY)} C ${String(startX + bend)} ${String(startY)}, ${String(node.x - bend)} ${String(endY)}, ${String(node.x - 7)} ${String(endY)}`,
            },
        ];
    });

    return (
        <div className="scroll-x">
            <svg
                className="line-diagram"
                width={width}
                height={height}
                viewBox={`0 0 ${String(width)} ${String(height)}`}
                role="img"
                aria-label={t('unit.line')}
            >
                <defs>
                    <clipPath id="line-diagram-icon" clipPathUnits="objectBoundingBox">
                        <rect width="1" height="1" rx="0.14" ry="0.14" />
                    </clipPath>
                    <marker
                        id="line-diagram-arrow"
                        viewBox="0 0 8 8"
                        refX="7"
                        refY="4"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                    >
                        <path className="line-diagram__head" d="M 0 1 L 7 4 L 0 7 z" />
                    </marker>
                </defs>

                {edges.map((edge) => (
                    <path
                        key={edge.key}
                        className="line-diagram__edge"
                        d={edge.path}
                        markerEnd="url(#line-diagram-arrow)"
                    />
                ))}

                {[...placed.values()].map((node) => (
                    <a key={node.unit.key} href={`#/unit/${node.unit.key}`}>
                        <g
                            className="line-diagram__node"
                            data-current={node.unit.key === current.key || undefined}
                        >
                            <rect x={node.x} y={node.y} width={nodeWidth} height={NODE_HEIGHT} rx="4" />
                            {node.unit.icon === null ? null : (
                                <image
                                    href={iconUrl(`Unit/${String(node.unit.icon)}.png`)}
                                    x={node.x + 10}
                                    y={node.y + (NODE_HEIGHT - ICON_SIZE) / 2}
                                    width={ICON_SIZE}
                                    height={ICON_SIZE}
                                    clipPath="url(#line-diagram-icon)"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            )}
                            <text className="line-diagram__name" x={node.x + LABEL_LEFT} y={node.y + 23}>
                                {node.name}
                            </text>
                            <text className="line-diagram__age" x={node.x + LABEL_LEFT} y={node.y + 39}>
                                {node.unit.key === current.key
                                    ? t('unit.lineCurrent')
                                    : t(`ages.${String(node.unit.age)}`)}
                            </text>
                        </g>
                    </a>
                ))}
            </svg>
        </div>
    );
}
