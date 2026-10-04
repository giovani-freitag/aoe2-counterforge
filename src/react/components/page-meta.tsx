import { useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useLocale } from '../hooks/use-locale.ts';
import { applyPageHead, buildPageHead, type Crumb } from '../page-head.ts';
import { PageHeadContext } from '../providers/page-head-context.ts';

/** The sections a page can sit under, and the route that lists each one. */
const SECTIONS = {
    units: { path: '/units', label: 'nav.units' },
    technologies: { path: '/techs', label: 'nav.technologies' },
    civilizations: { path: '/civs', label: 'nav.civilizations' },
} as const;

export type SiteSection = keyof typeof SECTIONS;

export interface PageMetaProps {
    /** What the page is about, without the site name. */
    title: string;
    description: string;
    /** What the page is called in a breadcrumb; the title when left out. */
    name?: string;
    /** Section the page belongs to, which puts it in a breadcrumb under that section's list. */
    section?: SiteSection;
    /** False on pages a search engine should leave out, such as one that found nothing. */
    indexable?: boolean;
}

/** What the current page tells the document head: title, description, addresses and breadcrumb. */
export function PageMeta({ title, description, name, section, indexable = true }: PageMetaProps) {
    const { t } = useTranslation();
    const locale = useLocale();
    const { pathname } = useLocation();
    const record = useContext(PageHeadContext);

    const head = useMemo(() => {
        const trail: Crumb[] = [];
        if (pathname !== '/') trail.push({ name: t('nav.home'), path: '/' });
        if (section && SECTIONS[section].path !== pathname) {
            trail.push({ name: t(SECTIONS[section].label), path: SECTIONS[section].path });
        }

        return buildPageHead({
            title,
            description,
            name: name ?? title,
            path: pathname,
            locale,
            siteName: t('app.title'),
            trail,
            indexable,
        });
    }, [t, locale, pathname, title, description, name, section, indexable]);

    // A page written ahead of time never runs its effects, so it hands its head over while rendering.
    record?.(head);

    useEffect(() => {
        applyPageHead(document, head);
    }, [head]);

    return null;
}
