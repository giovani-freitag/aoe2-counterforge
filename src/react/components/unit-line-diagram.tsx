import { useTranslation } from 'react-i18next';
import type { Unit } from '../../domain/entities/unit.ts';
import { iconUrl } from '../format.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useMediaQuery } from '../hooks/use-media-query.ts';

export interface UnitLineDiagramProps {
    /** One entry per upgrade step, each holding the alternatives at that point. */
    steps: readonly (readonly Unit[])[];
    current: Unit;
}

const NODE_HEIGHT = 52;
const ROW_GAP = 14;

/** Stacked, a node is a card: the portrait on top of the name, so two fit across a phone. */
const PORTRAIT_WIDTH = 132;
const PORTRAIT_LINE = 13;
const PORTRAIT_BASE_HEIGHT = 84;
const PORTRAIT_ICON = 34;
const PORTRAIT_CHARACTER_WIDTH = 6.4;
const COLUMN_GAP = 44;

/** Below this width the steps run down the page instead of across it. */
const STACKED = '(max-width: 40rem)';
const PADDING = 6;

/** Room between stacked steps, wide enough for the arrow to be read as one. */
const STACKED_GAP = 34;
const ICON_SIZE = 32;
const LABEL_LEFT = ICON_SIZE + 22;

/** Rough advance width of the label font, enough to size a box around a unit name. */
const CHARACTER_WIDTH = 7.4;
const MIN_NODE_WIDTH = 150;
const MAX_NODE_WIDTH = 280;

/**
 * Breaks a name over at most two lines, so a narrow card does not have to shrink to hold it.
 *
 * @param name - Unit name as the reader sees it.
 * @param limit - Characters a line can hold.
 * @returns One or two lines, the last one clipped if the name is longer than both.
 */
function wrap(name: string, limit: number): string[] {
    if (name.length <= limit) return [name];

    const lines: string[] = [''];
    for (const word of name.split(' ')) {
        const line = lines[lines.length - 1];
        if (line === '') lines[lines.length - 1] = word;
        else if (`${line} ${word}`.length <= limit) lines[lines.length - 1] = `${line} ${word}`;
        else lines.push(word);
    }

    return lines.length <= 2 ? lines : [lines[0], `${lines.slice(1).join(' ').slice(0, limit - 1)}…`];
}

/** How far the arrow stops short of the box it points at. */
const ARROW_HEAD = 8;
const CORNER = 8;

/**
 * Draws the connector between two boxes as an elbow with rounded corners.
 *
 * A curve that arrives at a box diagonally puts its arrowhead at an angle nothing else on the page
 * shares, and on a fork the two curves lean into each other. Turning the corner instead lets every
 * arrow meet its box square on, the way a tree is drawn.
 *
 * @param from - Where the connector leaves the parent.
 * @param to - Where it meets the child, head included.
 * @param vertical - True while the steps run down the page rather than across it.
 * @returns The path data for the connector.
 */
function elbow(from: Point, to: Point, vertical: boolean): string {
    const move = `M ${String(from.x)} ${String(from.y)}`;
    const same = vertical ? from.x === to.x : from.y === to.y;
    if (same) return `${move} ${vertical ? 'V' : 'H'} ${String(vertical ? to.y : to.x)}`;

    const span = vertical ? to.y - from.y : to.x - from.x;
    const shift = vertical ? to.x - from.x : to.y - from.y;
    const turn = Math.min(CORNER, Math.abs(span) / 2, Math.abs(shift) / 2);
    const along = Math.sign(span) * turn;
    const across = Math.sign(shift) * turn;
    const middle = (vertical ? from.y + to.y : from.x + to.x) / 2;

    return vertical
        ? [
              move,
              `V ${String(middle - along)}`,
              `Q ${String(from.x)} ${String(middle)}, ${String(from.x + across)} ${String(middle)}`,
              `H ${String(to.x - across)}`,
              `Q ${String(to.x)} ${String(middle)}, ${String(to.x)} ${String(middle + along)}`,
              `V ${String(to.y)}`,
          ].join(' ')
        : [
              move,
              `H ${String(middle - along)}`,
              `Q ${String(middle)} ${String(from.y)}, ${String(middle)} ${String(from.y + across)}`,
              `V ${String(to.y - across)}`,
              `Q ${String(middle)} ${String(to.y)}, ${String(middle + along)} ${String(to.y)}`,
              `H ${String(to.x)}`,
          ].join(' ');
}

interface Point {
    x: number;
    y: number;
}

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
    const stacked = useMediaQuery(STACKED);

    const names = new Map(steps.flat().map((unit) => [unit.key, text.unit(unit.key).name]));
    const longest = Math.max(...[...names.values()].map((name) => name.length));
    const longestWord = Math.max(...[...names.values()].flatMap((name) => name.split(' ').map((word) => word.length)));

    const nodeWidth = stacked
        ? Math.max(PORTRAIT_WIDTH, longestWord * PORTRAIT_CHARACTER_WIDTH + 16)
        : Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, LABEL_LEFT + longest * CHARACTER_WIDTH + 18));
    const lineLimit = Math.floor((nodeWidth - 12) / PORTRAIT_CHARACTER_WIDTH);
    const lines = Math.max(...[...names.values()].map((name) => wrap(name, lineLimit).length));
    const nodeHeight = stacked ? PORTRAIT_BASE_HEIGHT + (lines - 1) * PORTRAIT_LINE : NODE_HEIGHT;

    const widest = Math.max(...steps.map((step) => step.length));
    const across = stacked ? widest : steps.length;
    const down = stacked ? steps.length : widest;

    const gapAcross = stacked ? ROW_GAP : COLUMN_GAP;
    const width = PADDING * 2 + across * nodeWidth + (across - 1) * gapAcross;
    const height = PADDING * 2 + down * nodeHeight + (down - 1) * (stacked ? STACKED_GAP : ROW_GAP);

    const placed = new Map<string, PlacedNode>();
    steps.forEach((step, index) => {
        const spread = step.length * nodeWidth + (step.length - 1) * gapAcross;
        const stack = step.length * nodeHeight + (step.length - 1) * ROW_GAP;
        step.forEach((unit, choice) => {
            placed.set(unit.key, {
                unit,
                name: names.get(unit.key) ?? unit.key,
                x: stacked
                    ? (width - spread) / 2 + choice * (nodeWidth + gapAcross)
                    : PADDING + index * (nodeWidth + COLUMN_GAP),
                y: stacked
                    ? PADDING + index * (nodeHeight + STACKED_GAP)
                    : (height - stack) / 2 + choice * (nodeHeight + ROW_GAP),
            });
        });
    });

    const edges = [...placed.values()].flatMap((node) => {
        const parent = node.unit.upgradesFrom === null ? undefined : placed.get(node.unit.upgradesFrom);
        if (!parent) return [];

        const start = stacked
            ? { x: parent.x + nodeWidth / 2, y: parent.y + nodeHeight }
            : { x: parent.x + nodeWidth, y: parent.y + nodeHeight / 2 };
        const end = stacked
            ? { x: node.x + nodeWidth / 2, y: node.y - 1 }
            : { x: node.x - 1, y: node.y + nodeHeight / 2 };

        return [
            {
                key: `${parent.unit.key}-${node.unit.key}`,
                path: elbow(start, end, stacked),
            },
        ];
    });

    return (
        <div className={stacked ? undefined : 'scroll-x'}>
            <svg
                className="line-diagram"
                width={stacked ? '100%' : width}
                height={stacked ? undefined : height}
                style={stacked ? { maxWidth: width } : undefined}
                viewBox={`0 0 ${String(width)} ${String(height)}`}
                preserveAspectRatio="xMidYMin meet"
                role="img"
                aria-label={t('unit.line')}
            >
                <defs>
                    <clipPath id="line-diagram-icon" clipPathUnits="objectBoundingBox">
                        <rect width="1" height="1" rx="0.14" ry="0.14" />
                    </clipPath>
                    {/* Sized in user space so the head stays the same arrow whatever the stroke. */}
                    <marker
                        id="line-diagram-arrow"
                        viewBox="0 0 8 8"
                        refX="8"
                        refY="4"
                        markerWidth={ARROW_HEAD}
                        markerHeight={ARROW_HEAD}
                        markerUnits="userSpaceOnUse"
                        orient="auto"
                    >
                        <path className="line-diagram__head" d="M 0.5 0.5 L 8 4 L 0.5 7.5 z" />
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
                            <rect x={node.x} y={node.y} width={nodeWidth} height={nodeHeight} rx="4" />
                            {node.unit.icon === null ? null : (
                                <image
                                    href={iconUrl(`Unit/${String(node.unit.icon)}.png`)}
                                    x={stacked ? node.x + (nodeWidth - PORTRAIT_ICON) / 2 : node.x + 10}
                                    y={stacked ? node.y + 9 : node.y + (nodeHeight - ICON_SIZE) / 2}
                                    width={stacked ? PORTRAIT_ICON : ICON_SIZE}
                                    height={stacked ? PORTRAIT_ICON : ICON_SIZE}
                                    clipPath="url(#line-diagram-icon)"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            )}
                            {stacked ? (
                                <text
                                    className="line-diagram__name"
                                    x={node.x + nodeWidth / 2}
                                    y={node.y + PORTRAIT_ICON + 22}
                                    textAnchor="middle"
                                >
                                    {wrap(node.name, lineLimit).map((line, index) => (
                                        <tspan
                                            key={line}
                                            x={node.x + nodeWidth / 2}
                                            dy={index === 0 ? 0 : PORTRAIT_LINE}
                                        >
                                            {line}
                                        </tspan>
                                    ))}
                                </text>
                            ) : (
                                <text className="line-diagram__name" x={node.x + LABEL_LEFT} y={node.y + 23}>
                                    {node.name}
                                </text>
                            )}
                            <text
                                className="line-diagram__age"
                                x={stacked ? node.x + nodeWidth / 2 : node.x + LABEL_LEFT}
                                y={stacked ? node.y + nodeHeight - 10 : node.y + 39}
                                textAnchor={stacked ? 'middle' : undefined}
                            >
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
