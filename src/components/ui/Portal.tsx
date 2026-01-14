'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: ReactNode;
}

const Portal: React.FC<PortalProps> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use requestAnimationFrame to defer state update and avoid cascading renders
        const id = requestAnimationFrame(() => {
            setMounted(true);
        });
        return () => {
            cancelAnimationFrame(id);
            setMounted(false);
        };
    }, []);

    return mounted ? createPortal(children, document.body) : null;
};

export default Portal;
