const express = require('express')
const { disconnect } = require('process')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server) // initialising socket io
const { v4: uuidV4 } = require('uuid') // uuid for random string generation used in url

app.set('view engine', 'ejs') // using ejs
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`) // when enter, redirect to new random room
})

app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room }) // entered into specific room
})

// new connection made
io.on('connection', socket => {
    socket.on('init', roomId => {
        socket.join(roomId)
    })

    // join video call
    socket.on('join-room', (roomId, userId, name, on, mon) => {
        socket.join(roomId)
        user = {'id': userId, 'name': name, 'on': on, 'mon': mon}

        // user connected
        socket.to(roomId).emit('user-connected', user) 

        // user disconnected
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId)
        })

        // leave video call
        socket.on('leave', () => {
            socket.to(roomId).emit('user-disconnected', userId)
        })

        // user video off 
        socket.on('videoOff', () => {
            socket.to(roomId).emit('user-videoOff', userId)
        })

        // user video on
        socket.on('videoOn', () => {
            socket.to(roomId).emit('user-videoOn', userId)
        })

        // user audio off
        socket.on('audioOff', () => {
            socket.to(roomId).emit('user-audioOff', userId)
        })

        // user audio on
        socket.on('audioOn', () => {
            socket.to(roomId).emit('user-audioOn', userId)
        })

        // caption on
        socket.on('captionOn', captions => {
            io.to(roomId).emit('add-captions', {'id': userId, 'captions': captions})
        })

        // caption off
        socket.on('captionOff', () => {
            io.to(roomId).emit('remove-captions', userId)
        })
    })

    // user joined the chat
    socket.on('join-chat', (roomId, userId, name) => {
        socket.join(roomId)
        io.to(roomId).emit('user-joined-chat', userId, name)

        // message recieved
        socket.on('message', message => {
            io.to(roomId).emit('createMessage', message)
        });

        // leave chat
        socket.on('leave-chat', userId => {
            io.to(roomId).emit('user-left-chat', userId)
        })

        // get participants already in the chat
        socket.on('part', (id, uid, uname) => {
            io.to(roomId).emit('part-already', id, uid, uname)
        })

        // disconnect from chat
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId)
        })
    })
})

server.listen(3000)