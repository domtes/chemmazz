const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const { ExpressPeerServer } = require('peer');

app.enable('trust proxy');
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (request, response) => {
    // create a room
    // redirect to a room
    response.redirect(`/r/${uuidV4()}`)
})

app.get('/r/:room', (request, response) => {
    response.render('room', { roomId: request.params.room })
})

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId)
        socket.to(roomId).broadcast.emit('user-connected', userId)

        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId)
        })
    })
})

// Connection broker
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/domingo'
})

app.use('/peerjs', peerServer)

server.listen(3000, '0.0.0.0')