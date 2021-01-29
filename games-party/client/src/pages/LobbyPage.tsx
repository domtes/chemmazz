import { useCallback, useContext, useState } from 'react';
import { useLocation } from 'wouter';
import { GameContext } from '../context/store';

import { message, Button, Card, Col, Divider, Input, Row, Space, Typography } from 'antd';

const { Text, Title } = Typography;


function LobbyPage() {
    const { state, dispatch } = useContext(GameContext);
    const [displayName, setDisplayName] = useState();
    const [roomId, setRoomId] = useState<string>();
    const [, setLocation] = useLocation();

    const handleUsernameChange = useCallback((e) => {
        setDisplayName(e.target.value);
    }, []);

    const handleLogin = useCallback(async () => {
        console.log('Logging in with the server as', displayName);
        if (displayName === undefined) {
            return;
        }

        // Login with the server
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                display_name: displayName
            })
        });

        if (response.status === 200) {
            const body = await response.json();
            dispatch({
                type: 'LOGGED_IN', payload: {
                    user_id: body.user_id,
                    display_name: displayName
                }
            });
        } else {
            message.error(`Something bad happened: ${response.body}`);
        }
    }, [dispatch, displayName]);

    const handleLogout = useCallback(async () => {
        console.log('Logging out from the server');
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        dispatch({ type: 'LOGGED_OUT' });
    }, [dispatch]);

    const handleCreateRoom = useCallback(async () => {
        const room = await state.client.create('game', {
            user_id: state.session?.user_id,
            display_name: state.session?.display_name
        });
        console.log('Room created successfully', room);
        message.success(`Stanza creata: ${room.id}`);

        dispatch({ type: 'JOIN_ROOM', payload: room });
        setLocation(`/r/${room.id}`);
    }, [state, dispatch, setLocation]);

    const handleJoinRoom = useCallback(async () => {
        if (roomId === undefined) {
            return;
        }

        const room = await state.client.joinById(roomId, {
            user_id: state.session?.user_id,
            display_name: state.session?.display_name
        });

        dispatch({ type: 'JOIN_ROOM', payload: room });
        setLocation(`/r/${room.id}`);
    }, [roomId, state, dispatch, setLocation]);

    return <>
        <Row justify='center' align='middle' style={{ minHeight: '100vh' }}>
            <Col>
                <Card>
                    <Space direction='vertical' align='center'>
                        {(state.session === null) ? (
                            <>
                                <Title level={4}>Come vuoi essere chiamato?</Title>

                                <Input size='large' autoFocus
                                    placeholder='Il tuo nome'
                                    onChange={handleUsernameChange}
                                    onPressEnter={handleLogin}></Input>
                                <Button type='primary' onClick={handleLogin}>Entra</Button>
                            </>
                        ) : (
                                <>
                                    <Text>Ciao {state.session.display_name} ({state.session.user_id})!</Text>
                                    <Button type='primary' onClick={handleCreateRoom}>Crea una nuova stanza</Button >

                                    <Divider plain>oppure unisciti ad una stanza esistente</Divider>

                                    <Input placeholder='Codice stanza' onChange={(e) => setRoomId(e.target.value)} onPressEnter={handleJoinRoom}></Input>
                                    <Button onClick={handleJoinRoom}>Entra nella stanza</Button>

                                    <Button danger onClick={handleLogout}>Logout</Button>
                                </>
                            )}
                    </Space>
                </Card>
            </Col>
        </Row>
    </>
}

export default LobbyPage;
