import { useEffect, useRef } from 'react';
import { Badge } from 'antd';
import { useChatContext } from '../context/chatContext';


const HighlightedPlayer = ({ player }) => {
    const { connectedPeers, streamsRef } = useChatContext();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const stream = streamsRef?.current[player.sessionId];
        if (stream && videoRef.current) {
            console.log('[webrtc] Attaching stream to video element', player.sessionId, stream, videoRef.current);
            const video = videoRef.current;
            video.srcObject = stream;
        }
    }, [player, connectedPeers, streamsRef]);

    return (
        <div className="player">
            <div className="picture">
                <video ref={videoRef} title={player.displayName} autoPlay />
                <div className="lives">
                    <i className="fas fa-heart" title="1 Vita"></i>
                    <i className="fas fa-heart" title="1 Vita"></i>
                    <i className="fas fa-heart" title="1 Vita"></i>
                </div>
                <div className="status"></div>
            </div>
            <div className="name">
                {player.displayName} (Banco) {(player.prompt && player.prompt.visible) && (<Badge status="processing" />)}
            </div>
        </div>
    )
};

export default HighlightedPlayer;
