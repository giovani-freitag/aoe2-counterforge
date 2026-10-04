import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageMeta } from '../components/page-meta.tsx';

/** Fallback shown for unknown routes and unknown catalog slugs. */
export function NotFoundPage() {
    const { t } = useTranslation();

    return (
        <section className="card">
            <PageMeta title={t('common.notFound')} description={t('seo.home.description')} indexable={false} />
            <h1>{t('common.notFound')}</h1>
            <p className="prose" style={{ marginTop: 'var(--space-3)' }}>
                <Link to="/" className="badge badge--gold">
                    {t('common.goHome')}
                </Link>
            </p>
        </section>
    );
}
