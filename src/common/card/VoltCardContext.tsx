import { createContext, FC, ReactNode, useContext } from 'react';

interface IVoltCardContext {
    theme: string;
    /** Wired windows keep their own frame; every other card is a LucadoOS window. */
    isWired?: boolean;
}

const VoltCardContext = createContext<IVoltCardContext>({
    theme: null,
    isWired: false
});

export const VoltCardContextProvider: FC<{ value: IVoltCardContext; children?: ReactNode }> = (props) => {
    return <VoltCardContext value={props.value}>{props.children}</VoltCardContext>;
};

export const useVoltCardContext = () => useContext(VoltCardContext);
