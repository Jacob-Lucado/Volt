import { CSSProperties, FC, useEffect, useRef } from 'react';
import { ICatalogNode } from '../../../api';
import { LosIcon } from '../../../common/lucadoos';
import { useCatalogActions, useCatalogData } from '../../../hooks';
import { useCatalogNodeState } from '../../../hooks/catalog/useCatalog';
import { CatalogIconView } from '../views/catalog-icon/CatalogIconView';

// "(BC)" and "(Hot)" are technical suffixes; names such as "Flags (Wall)" stay whole.
const nodeLabel = (node: ICatalogNode) => (node?.localization || '').replace(/\s*\((?:BC|Hot)\)\s*$/i, '').trim();

const NavRow: FC<{ node: ICatalogNode; level: number; flat?: boolean; onActivate: (node: ICatalogNode) => void }> = ({
    node,
    level,
    flat = false,
    onActivate
}) => {
    const { isActive, isOpen } = useCatalogNodeState(node);
    const rowRef = useRef<HTMLButtonElement>(null);
    const showChildren = !flat && isOpen && node.isBranch;

    useEffect(() => {
        if (isActive) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [isActive]);

    return (
        <>
            <button
                ref={rowRef}
                type="button"
                role="treeitem"
                aria-expanded={node.isBranch && !flat ? isOpen : undefined}
                aria-level={level + 1}
                aria-selected={isActive}
                className={`los-cat__node${isActive ? ' is-active' : ''}${showChildren ? ' is-open' : ''}`}
                style={{ '--los-cat-level': level } as CSSProperties}
                onClick={() => onActivate(node)}
            >
                <span className="los-cat__node-icon">
                    <CatalogIconView icon={node.iconId} />
                </span>
                <span className="los-cat__node-label">{nodeLabel(node)}</span>
                {node.isBranch && !flat && <LosIcon name="chevron" size={12} />}
            </button>
            {showChildren && node.children.map((child) => child.isVisible && <NavRow key={child.id} node={child} level={level + 1} onActivate={onActivate} />)}
        </>
    );
};

export const LosCatalogNav: FC<{ node: ICatalogNode }> = ({ node }) => {
    const { searchResult = null } = useCatalogData();
    const { activateNode = null } = useCatalogActions();

    return (
        <div className="los-cat__nav los-scroll" role="tree" aria-label="Catalog categories">
            {searchResult
                ? searchResult.filteredNodes.map(({ node: found, depth }) => (
                      <NavRow key={found.id} flat node={found} level={Math.max(0, depth - 2)} onActivate={activateNode} />
                  ))
                : node?.children.map((child) => child.isVisible && <NavRow key={child.id} node={child} level={0} onActivate={activateNode} />)}
        </div>
    );
};
