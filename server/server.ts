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
