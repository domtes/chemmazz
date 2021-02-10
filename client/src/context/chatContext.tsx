import { createContext, useContext, useRef, useState, ReactNode, useEffect, MutableRefObject } from 'react';
import SimplePeer from 'simple-peer';

import { GameContext } from './store';


export interface IPlayer {
    sessionId: string;
}

export interface IChatContext {
    audio: boolean;
    video: boolean;

    toggleAudio: () => void;
    toggleVideo: () => void;

    callPlayer: (player: IPlayer, room: any) => void;
    streamsRef: MutableRefObject<Record<string, MediaStream>> | null;
    connectedPeers: Set<string>
}

export const ChatContext = createContext<IChatContext>({
    audio: true,
    video: true,

    toggleAudio: () => console.warn('No implementation provided'),
    toggleVideo: () => console.warn('No implementation provided'),
    callPlayer: (player, room) => console.warn('No implementation provided', player, room),
    streamsRef: null,
    connectedPeers: new Set()
});

export const useChatContext = () => useContext(ChatContext);

type Props = {
    children: ReactNode;
};

export const ChatProvider = ({ children }: Props) => {
    const [chatInitialized, setChatInitialized] = useState<boolean>(false);
    const { state } = useContext(GameContext);
    const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
    const [videoEnabled, setVideoEnabled] = useState<boolean>(false);

    const peersRef = useRef<Record<string, SimplePeer.Instance>>({});
    const streamsRef = useRef<Record<string, MediaStream>>({});
    const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());

    const setupVideoStream = async () => {
        if (state.room === null) return null;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        streamsRef.current[state.room.sessionId] = stream;
        setConnectedPeers(new Set([connectedPeers.values(), state.room.sessionId]));

        console.log('Got self stream:', state.room.sessionId, streamsRef.current);
        return stream;
    };

    const toggleAudio = () => {
        setAudioEnabled(!audioEnabled);
    }

    const toggleVideo = () => {
        setVideoEnabled(!videoEnabled);
    }

    const callPlayer = (player: IPlayer, stream: any) => {
        console.log('Calling player....', player, player.sessionId, stream);
        const existingPeer = peersRef.current[player.sessionId];
        if (!existingPeer) {
            console.log('Creating peer for player:', player.sessionId);
            const peer = createPeer(player.sessionId, state.room.sessionId, stream);
            peersRef.current[player.sessionId] = peer;
        } else {
            console.log('Player is already connected', player.sessionId, existingPeer);
        }
    }

    const callRoomParticipants = async () => {
        const stream = await setupVideoStream();
        console.log('Calling room participants:', state.gameState.players.values((p) => { return p.sessionId }));
        state.gameState.players.forEach((player) => {
            if (player.sessionId === state.room.sessionId) return;
            callPlayer(player, stream);
        });
    };

    const createPeer = (userToSignal, callerId, stream) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            state.room.send('webrtc', {
                command: 'call-player', payload: {
                    'callerId': callerId,
                    'targetId': userToSignal,
                    'signal': signal
                }
            });
        });

        peer.on('connect', () => {
            console.log('[webrtc] WEBRTC PEER CONNECTED! (1)');
        });

        peer.on('stream', stream => {
            console.log('[webrtc] Got remote stream (1)', userToSignal, stream);
            streamsRef.current[userToSignal] = stream;
            setConnectedPeers(new Set([connectedPeers.values(), userToSignal]));
        });

        return peer;
    }

    const addPeer = (incomingSignal, callerId, stream) => {
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream
        })

        peer.on("signal", signal => {
            state.room.send('webrtc', {
                command: 'answer-call', payload: {
                    'callerId': state.room.sessionId,
                    'targetId': callerId,
                    'signal': signal
                }
            });
        });

        peer.on('connect', () => {
            console.log('[webrtc] WEBRTC PEER CONNECTED! (2)');
        });

        peer.signal(incomingSignal);
        return peer;
    }

    useEffect(() => {
        if (chatInitialized || state.room === null || state.gameState.players.size === 0) return;
        console.log('[webrtc] Initializing chat');
        setChatInitialized(true);

        console.log('[webrtc] Registering incoming-call handler', state.room);

        state.room.onMessage('answer-call', msg => {
            console.log('[webrtc] Receiving answer-call:', msg);
            const peer = peersRef.current[msg.callerId];
            peer.signal(msg.signal);
        });

        state.room.onMessage('incoming-call', (msg) => {
            const stream = streamsRef.current[state.room.sessionId];
            console.log('[webrtc] Answering incoming call:', msg, stream);
            const peer = addPeer(msg.signal, msg.callerId, stream);
            peer.on('stream', stream => {
                console.log('[webrtc] Got remote stream (2)', msg.callerId);
                streamsRef.current[msg.callerId] = stream;

                setConnectedPeers(new Set([connectedPeers.values(), msg.callerId]));
            });
            peersRef.current[msg.callerId] = peer;
        });

        callRoomParticipants();

        return () => {
            console.log('[webrtc] Disposing ChatProvider');
            // if (state.room || state.gameState.players.size > 0) {
            //     console.log('[webrtc] Removing listeners for incoming-message')
            //     state.room.removeAllListeners('incoming-message');
            //     state.room.removeAllListeners('answer-call');

            //     streamsRef.current = {};
            //     setChatInitialized(false);
            // }
        }
    }, [state.room, state.gameState.players]);

    return (
        <ChatContext.Provider value={{
            audio: audioEnabled,
            video: videoEnabled,
            toggleAudio,
            toggleVideo,
            callPlayer,
            streamsRef,
            connectedPeers
        }}>
            {children}
        </ChatContext.Provider>
    )
}
