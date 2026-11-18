import { HabbiconAssetManager } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { PIXEL_ART_RENDERING } from '../../common';

export const STAFF_CHAT_FRANK_HABBICON_ID = 50;

export const getStaffChatFrankIconStyle = (size: number, imageUrl: string): CSSProperties => ({
    display: 'block',
    flex: '0 0 auto',
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: imageUrl ? `url("${imageUrl}")` : undefined,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${size}px ${size}px`,
    imageRendering: PIXEL_ART_RENDERING
});

export const StaffChatFrankIconView: FC<{ size: number; className?: string }> = ({ size, className = '' }) => {
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        const assetManager = HabbiconAssetManager.getInstance();
        let disposed = false;

        void assetManager.preload().then(() => {
            if (!disposed) setImageUrl(assetManager.getPreviewUrl(STAFF_CHAT_FRANK_HABBICON_ID));
        });

        return () => {
            disposed = true;
        };
    }, []);

    return <span aria-hidden="true" className={`staff-chat-frank-icon ${className}`.trim()} style={getStaffChatFrankIconStyle(size, imageUrl)} />;
};
