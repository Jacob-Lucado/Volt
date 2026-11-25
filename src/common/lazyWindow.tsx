import { VoltLogger } from '@volt/renderer';
import { Component, ComponentType, ErrorInfo, FC, lazy, LazyExoticComponent, ReactNode, Suspense } from 'react';

interface LazyWindowErrorBoundaryProps {
    name: string;
    onError?: () => void;
    children: ReactNode;
}

interface LazyWindowErrorBoundaryState {
    hasError: boolean;
}

class LazyWindowErrorBoundary extends Component<LazyWindowErrorBoundaryProps, LazyWindowErrorBoundaryState> {
    state: LazyWindowErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): LazyWindowErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        VoltLogger.error(`[LazyWindow:${this.props.name}] failed to load`, error, info.componentStack);
        this.props.onError?.();
    }

    render(): ReactNode {
        if (this.state.hasError) return null;

        return this.props.children;
    }
}

export function lazyWindow<P extends object>(
    loader: () => Promise<{ default: ComponentType<P> }>,
    name: string,
    fallback: ReactNode = null
): FC<P & { onChunkError?: () => void }> {
    let LazyComponent: LazyExoticComponent<ComponentType<P>> | null = null;

    const getLazyComponent = (): LazyExoticComponent<ComponentType<P>> => {
        if (!LazyComponent) {
            LazyComponent = lazy(async () => {
                try {
                    return await loader();
                } catch {
                    try {
                        return await loader();
                    } catch (error) {
                        LazyComponent = null;
                        throw error;
                    }
                }
            });
        }

        return LazyComponent;
    };

    const LazyWindowWrapper: FC<P & { onChunkError?: () => void }> = ({ onChunkError, ...props }) => {
        const ComponentToRender = getLazyComponent();

        return (
            <LazyWindowErrorBoundary name={name} onError={onChunkError}>
                <Suspense fallback={fallback}>
                    <ComponentToRender {...(props as P)} />
                </Suspense>
            </LazyWindowErrorBoundary>
        );
    };

    LazyWindowWrapper.displayName = `LazyWindow(${name})`;

    return LazyWindowWrapper;
}
