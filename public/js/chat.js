class Chat {
    /*************************************************************
     * Properties.
     *************************************************************/

    #url = 'ws://localhost:8080';

    #webSocket = new WebSocket(this.#url);

    #storage = window.localStorage;

    #forms = {
        register: document.getElementById('register'),
        message: document.getElementById('send-message')
    };

    #elements = {
        register_modal: document.getElementById('register-modal'),
        register_modal_back: document.querySelector('.modal-backdrop'),
        chat: document.getElementById('messages'),
        users: document.getElementById('users'),
        modal_error: document.getElementById('modal-error'),
        textbox: document.getElementById('text-box')
    }

    #audio = {
        login: '/assets/login.wav',
        message: '/assets/message.wav',
    }

    /**
     * Constructor.
     */
    constructor() {
        // bind
        this.event_submit_register = this.event_submit_register.bind(this);
        this.event_submit_message = this.event_submit_message.bind(this);
        this.event_ws_open = this.event_ws_open.bind(this);
        this.event_ws_message = this.event_ws_message.bind(this);
        this.event_logout = this.event_logout.bind(this);

        // init
        this.register_events();
        this.init_websocket();
    }

    /**
     * Register events
     */
    register_events() {
        this.#forms.register.addEventListener('submit', this.event_submit_register);
        this.#forms.message.addEventListener('submit', this.event_submit_message);
        this.init_color_picker();
    }

    init_websocket() {
        this.#webSocket.onopen = this.event_ws_open;
        this.#webSocket.onmessage = this.event_ws_message;
    }

    init_ui() {
        this.ws_send_message('users');
    }

    init_color_picker() {
        const dot = document.getElementById('color-sample');
        const picker = document.getElementById('color-picker');

        change_color(picker.value);

        picker.addEventListener('change', (event) => {
            change_color(event.target.value);
        });

        function change_color(value) {
            dot.style.cssText = `background-color: var(--bs-${value});`;
        }
    }

    connect() {
        if (this.is_logged_in()) {
            this.login();
            return;
        }

        this.open_register_modal();
    }

    login() {
        this.ws_send_message('login', this.get_logged_in_user());
        this.close_register_modal();
        this.#forms.message.querySelector('fieldset').disabled = false;
        this.init_ui();
        this.play_sound('login');
    }

    logout() {
        this.#storage.removeItem('user');
        window.location.reload();
    }

    /*************************************************************
     * Event Callbacks.
     *************************************************************/

    event_ws_open() {
        this.connect();

        this.#webSocket.send(JSON.stringify({
            type: 'test',
            content: 'this is a test',
        }));
    }

    /**
     * Get a message from the server.
     * 
     * @param {*} event event data
     */
    event_ws_message(event) {
        const msg = JSON.parse(event.data),
            data = msg.data;

        switch (msg.type) {
            case 'register':
                this.set_user(data);
                this.login();
                break;

            case 'users':
                this.init_users(data);
                break;

            case 'add_user':
                this.add_user(data);
                break;

            case 'message':
                this.add_chat_message(data);
                break;

            case 'error':
                this.show_error(data);
                break;
        }
    }

    /**
     * Event callback for register form submission..
     * 
     * @param {*} event
     */
    event_submit_register(event) {
        event.preventDefault();

        if (this.is_logged_in()) {
            return;
        }

        const formData = new FormData(event.target);
        const formProps = Object.fromEntries(formData);
        this.ws_send_message('register', formProps);
    }

    /**
     * Event callback for message submission.
     * 
     * @param {*} event
     */
    event_submit_message(event) {
        event.preventDefault();

        if (!this.is_logged_in()) {
            return;
        }

        const user = this.get_logged_in_user();

        this.ws_send_message('message', {
            username: user.username,
            color: user.color,
            content: this.#elements.textbox.value,
            time: new Date()
        });

        this.#elements.textbox.value = '';
    }

    event_logout(event) {
        event.preventDefault();
        this.logout();
    }

    /*************************************************************
     * User methods.
     *************************************************************/

    set_user(user) {
        this.#storage.setItem('user', JSON.stringify(user));
    }

    remove_user() {
        this.#storage.removeItem('user');
    }

    is_logged_in() {
        return !!this.get_logged_in_user();
    }

    get_logged_in_user() {
        return JSON.parse(this.#storage.getItem('user'));
    }

    /*************************************************************
     * UI Manipulation.
     *************************************************************/

    init_users(users) {
        this.#elements.users.innerHTML = '';
        users.forEach(user => this.add_user(user));
        document.getElementById('logout').addEventListener('click', this.event_logout);
    }

    add_user(data) {
        this.#elements.users.insertAdjacentHTML('beforeend', this.template_user(data));
    }

    add_chat_message(data, sound = 'message') {
        const message_date = new Date(data.time);
        data.time = message_date.toLocaleString();

        this.#elements.chat.insertAdjacentHTML('beforeend',
            data.username === this.get_logged_in_user().username ?
                this.template_self_message(data) : this.template_message(data)
        );

        this.#elements.chat.parentNode.scrollTop = this.#elements.chat.parentNode.scrollHeight;
        this.play_sound(sound);
    }

    show_error(error) {
        this.remove_user();
        this.open_register_modal();
        this.#elements.modal_error.innerText = error;
        this.#elements.modal_error.classList.remove('d-none');
    }

    hide_error() {
        this.#elements.modal_error.classList.add('d-none');
    }

    open_register_modal() {
        this.#elements.register_modal_back.tabIndex = 1;
        this.#elements.register_modal.tabIndex = 1;

        this.#elements.register_modal_back.classList.remove('d-none');
        this.#elements.register_modal.classList.remove('d-none');

        this.#elements.register_modal_back.classList.add('show');
        this.#elements.register_modal.classList.add('show');
    }

    close_register_modal() {
        this.#elements.register_modal_back.tabIndex = -1;
        this.#elements.register_modal.tabIndex = -1;

        this.#elements.register_modal.classList.remove('show');
        this.#elements.register_modal_back.classList.remove('show');

        this.#elements.register_modal_back.classList.add('d-none');
        this.#elements.register_modal.classList.add('d-none');
    }

    /*************************************************************
     * Helpers.
     *************************************************************/

    ws_send_message(type, data) {
        const msg = {
            type: type,
            data: data
        };

        this.#webSocket.send(JSON.stringify(msg));
    }

    play_sound(type) {
        if ( this.#audio[type] ) {
            const audio = new Audio(this.#audio[type]);
            audio.play();
        }
    }

    /*************************************************************
     * Templates.
     *************************************************************/

    /**
     * Message template.
     * 
     * @param {object} data 
     * @returns string
     */
    template_message(data) {
        return `<div class="message mb-4 d-flex fade show">
            <div class="avatar"><i class="bi bi-person d-inline-block rounded-circle p-2 border align-middle shadow-sm"></i></div>
            <div class="message-inner d-flex flex-column position-relative">
                <span class="message-user d-inline-block ps-2 mb-1 fw-bold">${data.username}</span>
                <p class="message-content color-${data.color} px-3 py-2 shadow-sm ms-1 mb-1">${data.content}</p>
                <small class="message-time ps-2 position-absolute top-100 end-0">${data.time}</small>
            </div>
        </div>`;
    }

    /**
     * Self message template.
     * 
     * @param {object} data 
     * @returns string
     */
    template_self_message(data) {
        return `<div class="message message-self mb-4 d-flex justify-content-end fade show">
            <div class="avatar order-2"><i class="bi bi-person d-inline-block rounded-circle p-2 border align-middle shadow-sm"></i></div>
            <div class="message-inner d-flex flex-column position-relative">
                <span class="message-user d-inline-block pe-2 mb-1 text-end fw-bold">${data.username}</span>
                <p class="message-content color-${data.color} px-3 py-2 shadow-sm me-1 mb-1">${data.content}</p>
                <small class="message-time ps-2 position-absolute top-100 start-0">${data.time}</small>
            </div>
        </div>`;
    }

    /**
     * User template.
     * 
     * @param {object} data user data
     * @returns string
     */
    template_user(data) {
        const logout = data.username == this.get_logged_in_user().username ? ` <a href="#" id="logout" class="float-end">logout</a>` : '';
        return `<li class="user-item list-group-item">
                    <i class="color-${data.color} bi bi-person d-inline-block rounded-circle p-1 align-middle shadow-sm lh-1 me-1"></i>
                    ${data.username}${logout}
                </li>`;
    }
}

new Chat();
