let io;

module.exports = {
    init: (server) => {
        const { Server } = require('socket.io');
        io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });

            socket.on('sendMessage', (messageData) => {
                console.log('Message received:', messageData);
                io.to(messageData.receiver_id).emit('receiveMessage', messageData);
            });

            socket.on('joinRoom', (userId) => {
                console.log(`User ${userId} joined their room`);
                socket.join(userId);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io is not initialized!');
        }
        return io;
    },
};
