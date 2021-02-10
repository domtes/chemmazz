import { useContext, useEffect, useRef } from 'react';
import { Card, Badge, Dropdown, Menu } from 'antd';
import { CrownOutlined, EllipsisOutlined, EuroOutlined, UserAddOutlined } from '@ant-design/icons';
import { GameContext } from '../context/store';
import { useStashManagement } from '../context/stashManagementContext';
import { useChatContext } from '../context/chatContext';

const { Meta } = Card;

const Player = ({ player, displayAdminMenu, isCurrentPlayer }) => {
    const { state } = useContext(GameContext);
    const { connectedPeers, streamsRef } = useChatContext();
    const { managePlayerStash } = useStashManagement();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const stream = streamsRef?.current[player.sessionId];
        if (stream && videoRef.current) {
            console.log('[webrtc] Attaching stream to video element', player.sessionId, stream, videoRef.current);
            const video = videoRef.current;
            video.srcObject = stream;
        }
    }, [player, connectedPeers, streamsRef]);

    const handleMenuClick = ({ key }) => {
        switch (key) {
            case 'make-owner':
                state.room.send('admin', {
                    command: 'give-room-ownership',
                    payload: { sessionId: player.sessionId }
                });
                break;
            case 'manage-stash':
                managePlayerStash(player);
                break;
            case 'assign-seat':
                state.room.send('admin', {
                    command: 'assign-seat',
                    payload: { sessionId: player.sessionId }
                });
                break;
            default:
                throw Error('Unkown menu item');
        }
    };

    const menu = (
        <Menu mode="vertical" onClick={handleMenuClick}>
            <Menu.Item key="manage-stash" icon={<EuroOutlined />}>
                Gestisci fondi
            </Menu.Item>
            {!player.playing && (
                <Menu.Item key="assign-seat" icon={<UserAddOutlined />}>
                    Assegna posto
                </Menu.Item>
            )}
            {!player.owner && (
                <>
                    <Menu.Divider />
                    <Menu.Item key="make-owner" icon={<CrownOutlined />} danger>
                        Rendi proprietario
                    </Menu.Item>
                </>
            )}
        </Menu>
    );

    return (
        <Badge.Ribbon text={player.stash}>
            <Card style={{ width: 180 }}
                actions={displayAdminMenu ? [
                    <Dropdown overlay={menu} trigger={['click']}>
                        <EllipsisOutlined key="ellipsis" />
                    </Dropdown>,
                ] : []}
            >
                <video ref={videoRef} width={130} title={player.displayName} autoPlay muted={isCurrentPlayer} />
                <Meta title={player.displayName} />
            </Card>
        </Badge.Ribbon>
    )
};

export default Player;