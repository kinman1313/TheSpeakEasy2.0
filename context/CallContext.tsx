// context/CallContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface CallContextProps {
    endCall: () => void;
}

const CallContext = createContext<CallContextProps | undefined>(undefined);

export const CallProvider = ({ children }: { children: ReactNode }) => {
    const [isCallActive, setIsCallActive] = useState(false);

    const endCall = () => {
        setIsCallActive(false);
        // Add any additional cleanup logic here
    };

    return (
        <CallContext.Provider value={{ endCall }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
