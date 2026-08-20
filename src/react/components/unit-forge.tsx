import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Unit } from '../../domain/entities/unit.ts';
import { useGameText } from '../hooks/use-game-text.ts';
import { useUnitLine } from '../hooks/use-unit-line.ts';
import { Forge } from './forge.tsx';
import { GameIcon } from './game-icon.tsx';
import { Icon } from './icon.tsx';

export interface UnitForgeProps {
    unit: Unit;
    name: string;
    /** One line naming what the unit is and where it is trained. */
    subtitle: string;
    /** Badges describing availability, shown under the line. */
    meta: ReactNode;
}

/** The head of a unit page, which adds the upgrade line to the shared banner. */
export function UnitForge({ unit, name, subtitle, meta }: UnitForgeProps) {
    const { t } = useTranslation();
    const text = useGameText();
    const steps = useUnitLine(unit);

    return (
        <Forge
            name={name}
            subtitle={subtitle}
            age={unit.age}
            meta={meta}
            portrait={
                <GameIcon path={unit.icon === null ? null : `Unit/${String(unit.icon)}.png`} alt="" size="lg" />
            }
        >
            {steps.length > 1 ? (
                <div className="forge__line">
                    {steps.map((step, index) => (
                        <span className="forge__step-wrap" key={step[0].key}>
                            {index > 0 ? <Icon name="next" className="forge__arrow" /> : null}
                            <span className="forge__fork">
                                {step.map((member, choice) => (
                                    <Fragment key={member.key}>
                                        {choice > 0 ? <span className="forge__or">{t('unit.lineOr')}</span> : null}
                                        <Link
                                            className="forge__step"
                                            to={`/unit/${member.key}`}
                                            data-here={member.key === unit.key || undefined}
                                        >
                                            <GameIcon
                                                path={member.icon === null ? null : `Unit/${String(member.icon)}.png`}
                                                alt=""
                                                size="sm"
                                            />
                                            {text.unit(member.key).name}
                                        </Link>
                                    </Fragment>
                                ))}
                            </span>
                        </span>
                    ))}
                </div>
            ) : null}
        </Forge>
    );
}
