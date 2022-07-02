import { createServer } from 'http';
import staticHandler from 'serve-handler';
import ws, { WebSocketServer } from 'ws';

/**
 * Globals.
 */
const port   = 8080;
const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'public' })
});

const wss       = new WebSocketServer({ server });
const g_users   = [];
const g_history = [];

/**
 * WebSocket handlers.
 */
wss.on('connection', (client) => {

    /**
     * Client sends a message.
     */
    client.on('message', raw_message => {
        try {
            const msg = JSON.parse(raw_message);

            switch (msg.type) {
                case 'register':
                    action_register(msg, client);
                    break;

                case 'login':
                    action_login(msg, client);
                    break;

                case 'users':
                    action_get_users(client);
                    break;

                case 'history':
                    action_get_history(client);
                    break;

                case 'message':
                    action_send_message(msg);
                    break;
            
                default:
                    break;
            }            
        } catch(e) {
            console.log(e);
        }
    });

    /**
     * Client closes connection.
     */
    client.on('close', () => {
        remove_user(client);
        broadcast('users', get_users());
    });
});

/**
 * Server listen.
 */
server.listen(port, () => { 
    console.log('server listening...'); 
});

/**
 * Send message to all clients.
 * 
 * @param {object} msg message from client
 */
function action_send_message(msg) {
    const message_data = {
        username: msg.data.username,
        color: msg.data.color,
        content: msg.data.content,
        time: new Date(),
    };

    g_history.push(message_data);
    broadcast('message', message_data);
}

/**
 * Get chat history for clients.
 * 
 * @param {object} client 
 */
function action_get_history(client) {
    client_send(client, 'history', g_history);
}

/**
 * Get user list for a client.
 * 
 * @param {object} client 
 */
function action_get_users(client) {
    client_send(client, 'users', get_users());
}

/**
 * User login to the chat.
 * 
 * @param {object} msg 
 * @param {object} client 
 */
function action_login(msg, client) {
    if (user_exists(msg.data.username)) {
        client_send(client, 'error', 'Username is already taken. please choose another one!');
        return;
    }

    broadcast('add_user', msg.data);
    add_user(client, msg.data.username, msg.data.color);
}

/**
 * Register a new user.
 * 
 * @param {object} msg 
 * @param {object} client 
 * @returns 
 */
function action_register(msg, client) {
    if (user_exists(msg.data.username)) {
        client_send(client, 'error', 'Username is already taken. please choose another one!');
        return;
    }

    client_send(client, 'register', msg.data);
}

/**
 * Broadcast a message to all clients.
 * 
 * @param {string} type 
 * @param {*} data 
 */
function broadcast(type, data) {
    const msg_json = JSON.stringify({
        type: type,
        data: data,
    });

    for (const user of g_users) {
        if (user.client.readyState === ws.OPEN) { 
            user.client.send(msg_json);
        }
    }
}

/**
 * Send a message to a client.
 * 
 * @param {object} client 
 * @param {string} type 
 * @param {*} data 
 */
function client_send(client, type, data) {
    client.send(JSON.stringify({
        type: type,
        data: data
    }));
}

/**
 * Get users without ws client object.
 * 
 * @param {object} client 
 * @param {string} type 
 * @param {*} data 
 */
function get_users() {
    const logged_in_users = [...g_users];
    return logged_in_users.map( user => Object.assign({}, { username: user.username, color: user.color }) );
}

/**
 * Add a user to the global var.
 * 
 * @param {object} client 
 * @param {string} username 
 * @param {string} color 
 */
function add_user(client, username, color) {
    g_users.push({
        client: client,
        username: username,
        color: color
    });
}

/**
 * Remove a user from the global var.
 * 
 * @param {object} client
 */
function remove_user(client) {
    const index = g_users.findIndex( user => user.client == client );

    if ( index >= 0 ) {
        g_users.splice(index, 1);
    }
}

/**
 * Checks if user exists.
 * 
 * @param {string} username 
 * @returns bool
 */
function user_exists(username) {
    return !!g_users.find( user => user.username == username );
}