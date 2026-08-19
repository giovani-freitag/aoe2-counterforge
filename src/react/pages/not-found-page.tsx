import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** Fallback shown for unknown routes and unknown catalog slugs. */
export function NotFoundPage() {
    const { t } = useTranslation();

    return (
        <section className="card">
            <h1>{t('common.notFound')}</h1>
            <p className="prose" style={{ marginTop: 'var(--space-3)' }}>
                <Link to="/" className="badge badge--gold">
                    {t('common.goHome')}
                </Link>
            </p>
        </section>
    );
}
