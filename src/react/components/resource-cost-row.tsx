import { useTranslation } from 'react-i18next';
import { RESOURCES } from '../../domain/enums/resource.ts';
import type { ResourceCost } from '../../domain/values/resource-cost.ts';
import { short } from '../format.ts';
import { ResourceIcon } from './resource-icon.tsx';

export interface ResourceCostRowProps {
    cost: ResourceCost;
    trailing?: string;
}

/** Shows a unit or technology cost as coloured resource chips. */
export function ResourceCostRow({ cost, trailing }: ResourceCostRowProps) {
    const { t } = useTranslation();
    const amounts = cost.toRecord();
    const spent = RESOURCES.filter((resource) => amounts[resource] > 0);

    return (
        <div className="cost">
            {spent.map((resource) => (
                <span key={resource} className="cost__item" title={t(`resources.${resource}`)}>
                    <ResourceIcon resource={resource} />
                    {short(amounts[resource])}
                    <span className="visually-hidden">{t(`resources.${resource}`)}</span>
                </span>
            ))}
            {trailing ? <span className="badge">{trailing}</span> : null}
        </div>
    );
}
