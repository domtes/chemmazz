import { useCallback, useContext, useEffect, useState } from 'react';
import { Badge, Layout, Row, Col, Space, Typography, Button, message, Statistic } from 'antd';
import { PauseCircleOutlined, PlaySquareOutlined } from '@ant-design/icons';
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import { useLocation } from 'wouter';

import { GameContext } from '../context/store';
import { StashManagementProvider } from '../context/stashManagementContext';

import StashManagementDrawer from '../components/StashManagementDrawer';
import HighlightedPlayer from '../components/HighlightedPlayer';
import Player from '../components/Player';
import Hand from '../components/Hand';
import Prompt from '../components/Prompt';

const { Content } = Layout;
const { Title } = Typography;

const PlayRoomPage = ({ params }) => {
    const roomId = params.roomId;
    const { state, dispatch } = useContext(GameContext);
    const [, setLocation] = useLocation();
    const fullScreenHandle = useFullScreenHandle();

    const [isRoomOwner, setIsRoomOwner] = useState(false);
    const [thisPlayerHand, setThisPlayerHand] = useState([]);
    const [thisPlayerPrompt, setThisPlayerPrompt] = useState([]);
    const [thisPlayerScore, setThisPlayerScore] = useState();

    useEffect(() => {
        console.log('Room id:', roomId);
        console.log('Global state:', state);
        console.log('Current user:', state.session?.display_name, state.session?.user_id);

        const joinRoom = async () => {
            if (state.room === null) {
                console.log('Room not joined yet:', state.gameState.user_id, state.gameState.display_name);
                try {
                    const room = await state.client.joinById(roomId, {
                        user_id: state.session?.user_id,
                        display_name: state.session?.display_name
                    });
                    dispatch({ type: 'JOIN_ROOM', payload: room });
                } catch (error) {
                    message.error('Stanza non tovata');
                    setLocation('/');
                }
            } else {
                console.log('Registering room handlers');
                state.room.onStateChange((newState) => {
                    console.log('Room state changed:', newState);
                    dispatch({ type: 'GAME_STATE', payload: { ...newState } });
                    const isOwner = newState.roomOwner === state.session?.user_id;
                    setIsRoomOwner(isOwner);
                });

                state.room.onMessage('notification', (msg) => {
                    console.log('Message received from server:', msg);
                    const msg_type = msg.type || 'info';
                    message[msg_type](msg.text);
                });
            }
        };
        joinRoom();

        return () => {
            if (state.room) {
                console.log('Removing room listeners...');
                state.room.removeAllListeners();
                dispatch({ type: 'LEAVE_ROOM' });
            }
        }
    }, [state.room]);

    useEffect(() => {
        if (state.room === null) return;

        // Setting the current player reference
        const p = state.gameState.players.get(state.room.sessionId);
        if (p !== undefined) {
            console.log('Setting current player hand:', p, p.hand);
            setThisPlayerHand(p.hand);
            setThisPlayerPrompt(p.prompt);
            setThisPlayerScore(p.score);
        }
    }, [state.room, state.gameState]);

    const handleStartGame = useCallback(() => {
        state.room.send('admin', { command: 'start-game' });
    }, [state.room]);

    const handlePauseGame = useCallback(() => {
        state.room.send('admin', { command: 'pause-game' });
    }, [state.room]);

    const handleResumeGame = useCallback(() => {
        state.room.send('resume-game', {});
    }, [state.room]);

    return (
        <FullScreen handle={fullScreenHandle}>
            <StashManagementProvider>
                <Layout className='play-room'>
                    <Content>
                        <Row justify="center">
                            <Col flex="auto" className={`main-scene bg-${state.gameState.bg}`}>
                                {isRoomOwner && (
                                    <Space className="admin-commands">
                                        {!state.gameState.running && (
                                            <Button icon={<PlaySquareOutlined />} type="link" size="large" onClick={handleStartGame} />
                                        )}

                                        {(state.gameState.running && state.gameState.paused) && (
                                            <Button icon={<PlaySquareOutlined />} type="link" size="large" onClick={handleResumeGame} />
                                        )}

                                        {(state.gameState.running && !state.gameState.paused) && (
                                            <Button icon={<PauseCircleOutlined />} type="link" size="large" onClick={handlePauseGame} />
                                        )}
                                    </Space>
                                )}

                                {(state.gameState.running && !state.gameState.paused) && (
                                    <Space direction="vertical" align="center" style={{ width: '100%' }} size="large">
                                        <Statistic title="Piatto" value={state.gameState.pot} />

                                        <Space direction="horizontal" align="baseline" split="VS" size="large" className="the-ring">
                                            <Space direction="vertical">
                                                <HighlightedPlayer player={state.gameState.player1} />
                                                <Hand cards={state.gameState.player1.hand} showHole={false} />
                                            </Space>
                                            <Space direction="vertical">
                                                <HighlightedPlayer player={state.gameState.player2} />
                                                <Hand cards={state.gameState.player2.hand} showHole={false} />
                                                <Statistic title="Scommessa" value={state.gameState.currentBet} />
                                            </Space>
                                        </Space>
                                    </Space>
                                )}

                            </Col>
                            <Col className="players" xs={4} md={6} lg={8} xl={10}>
                                <Title level={4}>In gioco</Title>
                                <Space size={12} wrap>
                                    {Array.from<any>(state.gameState.players.values()).filter((player, index) => {
                                        return player.playing;
                                    }).map((player, index) => (
                                        <Player key={index} player={player} displayAdminMenu={isRoomOwner} isCurrentPlayer={state.room.sessionId === player.sessionId} />
                                    ))}
                                </Space>

                                <Title level={4}>Spettatori</Title>
                                <Space size={12} wrap>
                                    {Array.from<any>(state.gameState.players.values()).filter((player, index) => {
                                        return !player.playing;
                                    }).map((player, index) => (
                                        <Player key={index} player={player} displayAdminMenu={isRoomOwner} isCurrentPlayer={state.room.sessionId === player.sessionId} />
                                    ))}
                                </Space>
                            </Col>
                        </Row>

                        <Row>
                            <Col className="game-controls" span={24}>
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {/* <Button onClick={fullScreenHandle.enter}>Full screen</Button> */}
                                    <Row>
                                        <Col flex={2}>
                                            <Hand cards={thisPlayerHand} showHole={true} />
                                        </Col>
                                        <Col flex={2}>
                                            <Space direction="vertical">
                                                {thisPlayerHand.length > 0 && <Statistic title="Il tuo punteggio:" value={thisPlayerScore} />}
                                                <Prompt prompt={thisPlayerPrompt} />
                                            </Space>
                                        </Col>
                                    </Row>
                                </Space>
                            </Col>
                        </Row>
                        <StashManagementDrawer />
                    </Content>
                </Layout>
            </StashManagementProvider>
        </FullScreen >
    );
}

export default PlayRoomPage;
