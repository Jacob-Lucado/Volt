import { FC, lazy, Suspense, useEffect, useState } from 'react';
import { Permission } from '../../api/permissions';
import { useHasPermission, useModAlertStore, useModTools } from '../../hooks';

const LazyModToolsContent = lazy(() =>
    import('./ModToolsContent').then((module) => ({ default: module.ModToolsContent }))
);

export const ModToolsView: FC<{}> = () => {
    const { settings = null } = useModTools();
    const canUseModTools = useHasPermission(Permission.ModerationTool);
    const hasAlerts = useModAlertStore((state) => state.alerts.length > 0);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        if (settings || canUseModTools || hasAlerts) setHasMounted(true);
    }, [settings, canUseModTools, hasAlerts]);

    if (!hasMounted) return null;

    return (
        <Suspense fallback={null}>
            <LazyModToolsContent />
        </Suspense>
    );
};
