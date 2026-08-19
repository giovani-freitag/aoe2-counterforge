import type { Resource } from '../../domain/enums/resource.ts';
import { iconUrl } from '../format.ts';

export interface ResourceIconProps {
    resource: Resource;
}

/** The resource token the game itself draws in its panels. */
export function ResourceIcon({ resource }: ResourceIconProps) {
    return <img className="resource-icon" src={iconUrl(`ui/${resource}.png`)} alt="" loading="lazy" decoding="async" />;
}
