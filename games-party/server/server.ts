import { Server } from 'colyseus';
import * as express from 'express';

import { createServer } from 'http';

import * as session from 'express-session';

import { randomBytes } from 'crypto';
import { GameRoom } from './rooms/game';

interface User {
    user_id: string;
    display_name: string;
}

const connected_users: { [id: string]: User } = {};
const validateSession = (user_id => {
    console.log(`Is ${user_id} in ${Object.keys(connected_users)}?`);
    if (Object.keys(connected_users).includes(user_id)) {
        const user_info = connected_users[user_id];
        console.log('Yes!', user_info);
        return user_info;
    }
    console.log('No!');
    return false;
});

// - Augments built-in Node.js IncomingMessage to include "session"
// - Lets TypeScript recognize "request.session" during onAuth()
declare module 'http' {
    interface IncomingMessage {
        session: session.Session
    }
}

const sessionParser = session({
    secret: 'any secret string',
    // store: new RedisStore({ client: redisClient })
});

const port = Number(process.env.port) || 3001;

const app = express();
app.use(sessionParser);
app.use(express.json());
app.use(express.static('../client/build'))

app.post('/api/login', (req, res) => {
    // login to the server (a unique display name is enough)
    const username = req.body.display_name;
    console.log('Login request with display name', username, connected_users);
    const existing_user = Object.values(connected_users).find(user => user.display_name === username);
    if (existing_user) {
        console.log('oh no, no no, oh no non ononononono');
        res.status(401).json({ sto: 'cazzo' });
    } else {
        const random_id = `player-${randomBytes(16).toString('hex')}`;
        connected_users[random_id] = {
            user_id: random_id,
            display_name: username,
        };

        req.session!['user_id'] = random_id;
        req.session!['display_name'] = username;

        console.log('oh yeah!', connected_users);
        res.json({ user_id: random_id });
    }
});

app.post('/api/logout', (req, res) => {
    const user_id = req.session!['user_id'];
    console.log('Logging out user:', user_id);

    delete connected_users[user_id];
    delete req.session!['user_id'];
    delete req.session!['display_name'];
    res.json({ bye: 'bye' });
});

app.get('/api/session', (req, res) => {
    // returns session data
    res.json(req.session!);
});

const gameServer = new Server({
    server: createServer(app),
    verifyClient: (info, next) => {
        // Make 'session' available for the websocket connection (during onAuth())
        sessionParser(info.req as any, {} as any, () => next(true));
    }
});

gameServer.define('game', GameRoom, { validateSession: validateSession });
gameServer.listen(port, '0.0.0.0');



// Connection broker
// const peerServerOptions = {
//     debug: true,
//     path: '/domingo'
// };

// const peerServer = ExpressPeerServer(server, peerServerOptions);
// app.use('/peerjs', peerServer);


// const joined_users = {};
// const rooms = {};

// io.on('connection', socket => {
//     let user = null;
//     let session_id = null;

//     socket.on('JOIN_AS', (username) => {
//         console.log('JOIN_AS', username);
//         if (username === null || username in Object.values(joined_users)) {
//             socket.emit('ERROR', 'Lo username non é valido oppure risulta giá in uso');
//             return;
//         }

//         session_id = uuidV4();
//         user = username;
//         joined_users[session_id] = user;
//         socket.emit('JOINED', session_id);
//     });

//     socket.on('CREATE_ROOM', (session_token) => {
//         if (session_token !== session_id) {
//             socket.emit('ERROR', 'Non sei autorizzato a creare una stanza');
//             return;
//         }

//         const roomId = uuidV4();
//         rooms[roomId] = {
//             owner: user,
//             participants: {} // maps session tokens to peer ids
//         };

//         console.log(`Created new room ${roomId} for user ${user}`);
//         socket.emit('ROOM_CREATED', roomId);
//     });

//     socket.on('JOIN_ROOM', (session_token, roomId, peerId, callback) => {
//         console.log('DEBUG: JOIN_ROOM', session_token, roomId, peerId);
//         if (roomId in rooms === false) {
//             socket.emit('ERROR', 'Stanza non trovata');
//             console.log(`Cercava ${roomId} in ${rooms}`);
//             return;
//         }

//         if (peerId === null) {
//             socket.emit('ERROR', 'Peer ID mancante nella richiesta');
//             return;
//         }

//         if (session_token in joined_users === false) {
//             socket.emit('ERROR', 'La sessione non é valida');
//             return;
//         }

//         const user = joined_users[session_token];
//         console.log(`User ${user} is joining room ${roomId}`);

//         // Aggiorna la stanza con il peerId
//         const user_obj = {
//             user_id: session_token,
//             display_name: user,
//             peer: peerId
//         };
//         rooms[roomId].participants[session_token] = user_obj;

//         // Annuncia l'utente nella stanza
//         socket.join(roomId);
//         socket.to(roomId).broadcast.emit('USER_CONNECTED', session_token, user_obj);

//         // Restituisce la lista aggiornata dei giocatori della stanza
//         callback({ participants: rooms[roomId].participants });
//     });
// })
