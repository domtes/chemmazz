import React, { createContext, useEffect, useReducer } from 'react';
import * as Colyseus from 'colyseus.js';

const SOCKET_URL = `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${(window.location.port && `:${window.location.port}`)}/api`;
console.log('Socket location:', SOCKET_URL);

type SessionType = {
    user_id: string;
    display_name: string;
}

type GameContextType = {
    client: any;
    session: SessionType | null;
    room: any;
    bg: number;
    gameState: any;
};

const initialState = {
    client: new Colyseus.Client(SOCKET_URL),
    session: null,
    room: null,
    bg: 4,
    gameState: {
        pot: 0,
        players: new Map<string, any>()
    }
};

const GameContext = createContext<{
    state: GameContextType;
    dispatch: React.Dispatch<any>;
}>({
    state: initialState,
    dispatch: () => null
});
const { Provider } = GameContext;

const StateProvider = ({ children }) => {
    useEffect(() => {
        const fetchSessionData = async () => {
            const response = await fetch('/api/session', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('Session data fetched:', data);

            if ('user_id' in data) {
                dispatch({
                    type: 'LOGGED_IN',
                    payload: data
                });
            }
        };
        fetchSessionData();
    }, []);

    const [state, dispatch] = useReducer((state, action) => {
        switch (action.type) {
            case 'LOGGED_IN':
                return {
                    ...state,
                    session: action.payload
                };
            case 'LOGGED_OUT':
                return {
                    ...state,
                    session: null
                };
            case 'JOIN_ROOM':
                console.log('JOIN_ROOM', action);
                return {
                    ...state,
                    room: action.payload
                };
            case 'LEAVE_ROOM':
                console.log('LEAVE_ROOM');
                return {
                    ...state,
                    room: null
                };
            case 'GAME_STATE':
                return {
                    ...state,
                    gameState: action.payload
                };
            default:
                throw new Error();
        };
    }, initialState);

    return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { GameContext, StateProvider }
