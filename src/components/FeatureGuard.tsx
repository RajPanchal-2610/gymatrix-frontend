import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface FeatureGuardProps {
    children: ReactNode;
    feature: string;
    redirectTo?: string;
}

export function FeatureGuard({ children, feature, redirectTo = "/" }: FeatureGuardProps) {
    const { hasFeature, loading } = useSubscription();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasFeature(feature)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
