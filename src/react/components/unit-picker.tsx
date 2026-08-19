import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnitSearch } from '../hooks/use-unit-search.ts';
import { GameIcon } from './game-icon.tsx';

export interface UnitPickerProps {
    label: string;
    /** Units already picked, hidden from the suggestions. */
    exclude: readonly string[];
    onPick: (unitKey: string) => void;
}

const SUGGESTION_LIMIT = 6;

/** Search-backed input for adding one more unit to a list. */
export function UnitPicker({ label, exclude, onPick }: UnitPickerProps) {
    const { t } = useTranslation();
    const [term, setTerm] = useState('');
    const outcome = useUnitSearch(term);

    const suggestions = outcome.hits
        .filter((hit) => hit.document.kind === 'unit')
        .filter((hit) => !exclude.includes(hit.document.key))
        .slice(0, SUGGESTION_LIMIT);

    const pick = (unitKey: string) => {
        setTerm('');
        onPick(unitKey);
    };

    return (
        <div className="picker">
            <label className="field__label" htmlFor="unit-picker">
                {label}
            </label>
            <input
                id="unit-picker"
                type="search"
                className="input"
                value={term}
                placeholder={t('compare.pickPlaceholder')}
                autoComplete="off"
                onChange={(event) => { setTerm(event.target.value); }}
            />
            {term.trim() && suggestions.length > 0 ? (
                <ul className="picker__results">
                    {suggestions.map((hit) => (
                        <li key={hit.document.id}>
                            <button type="button" className="list-item" onClick={() => { pick(hit.document.key); }}>
                                <GameIcon path={hit.document.icon} alt="" size="sm" />
                                <span className="list-item__body">
                                    <span className="list-item__title">{hit.document.title}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
