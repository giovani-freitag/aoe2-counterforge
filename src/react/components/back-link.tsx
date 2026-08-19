import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from './icon.tsx';

export interface BackLinkProps {
    to: string;
    label: string;
}

/** The way out of a detail page, since the navigation bar only names sections. */
export function BackLink({ to, label }: BackLinkProps) {
    const { t } = useTranslation();

    return (
        <Link className="backlink" to={to}>
            <Icon name="back" />
            {t('nav.backTo', { section: label })}
        </Link>
    );
}
