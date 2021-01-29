import { createContext, useContext, useState, ReactNode } from 'react';

export interface IPlayer {
    id: string;
    sessionId: string;
    displayName: string;
    stash: number;
}

export interface IPlayerStashContext {
    visible: boolean;
    player: IPlayer | undefined;
    managePlayerStash: (player: IPlayer | undefined) => void;
    hide: () => void;
}

export const StashManagementContext = createContext<IPlayerStashContext>({
    visible: false,
    player: undefined,
    managePlayerStash: player => console.warn('No stash management provider', player),
    hide: () => console.warn('No hide implementation provided')
});

export const useStashManagement = () => useContext(StashManagementContext);

type Props = {
    children: ReactNode;
};

export const StashManagementProvider = ({ children }: Props) => {
    const [visible, setVisible] = useState<boolean>(false);
    const [player, setPlayer] = useState<IPlayer | undefined>(undefined);

    const managePlayerStash = (player: IPlayer | undefined) => {
        if (player) {
            setPlayer(player);
        }
        setVisible(true);
    };

    const hide = () => {
        setVisible(false);
    }

    return (
        <StashManagementContext.Provider value={{ visible, player, managePlayerStash, hide }}>
            {children}
        </StashManagementContext.Provider>
    )
}
