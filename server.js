require('rootpath')();
const express = require('express');
const app = express();
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('_middleware/error-handler');
const path = require('path'); 
const socket = require('_helpers/socket'); // Import the socket module


const server = http.createServer(app);
socket.init(server);  // <-- Ensure socket is initialized before routes


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors request from any origin and with credentials
app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/items', require('./Items/items.controller'));  // Add items routes
app.use('/chat', require('./chat/chat.controller'));


// swagger docs route
app.use('/api-docs', require('_helpers/swagger'));

app.use('/uploads', express.static('uploads'));


//global error handler
app.use(errorHandler);

app.use('/assets', express.static(path.join(__dirname, 'assets')));


// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
server.listen(port, () => console.log('Server listening on port ' + port));