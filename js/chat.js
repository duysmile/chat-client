const username = localStorage.getItem('userName');
const userId = localStorage.getItem('userId');
const LIMIT_PAGINATION = 10;
let page = 1;

$(document).ready(function() {
    localStorage.setItem('listUserToChat', '');
    localStorage.setItem('listMembersToChat', '');
    localStorage.setItem('roomId', '');
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        window.location.href = '/';
        return;
    }

    $('#username').html(username);

    $('#btn-logout').on('click', function() {
        localStorage.clear();
        window.location.href = '/';
    });

    loadRooms(accessToken).then(() => {
        $(document).on('click', '.info[data-room-id]', async function(event) {
            const roomId = $(this).attr('data-room-id');
            localStorage.setItem('roomId', roomId);
            $('#messages').html('');
            await loadMessages(roomId, accessToken);
            $('#messages').scroll(_.throttle(async function () {
                if ($(this).scrollTop() === 0) {
                    const roomId = localStorage.getItem('roomId');
                    const lastMessageId = $('#messages div:first-child').attr('data-message-id')
                    await loadMessages(roomId, accessToken, lastMessageId);
                    $(".chat-box .list").animate({ scrollTop: 20 }, 500);
                }
            }, 500));

            $(`[data-room-id=${roomId}] .font-weight-bold`).removeClass('font-weight-bold');            
            scrollToBottom();
        });
    }).catch(err => {
        console.error(err);
        window.location.href = '/';
    });
    
    $('#rooms').scroll(_.debounce(async function () {
        if ($(this).scrollTop() + $(this).innerHeight() > $(this)[0].scrollHeight) {
            page += 1;
            await loadRooms(accessToken, page);
        }
    }, 300, {
        leading: true,
        trailing: true
    }));

    $('#search-group').on('input', _.debounce(async function () {
        const name = $(this).val();
        await loadUsers(name, accessToken);
    }, 500, {
        // leading: true,
        trailing: true
    }));

    $(document).on('click', '.dropdown-item', function() {
        const username = $(this).text();
        const userId = $(this).attr('data-user-id');
        let listUserToChat = JSON.parse(!!localStorage.getItem('listUserToChat') ? localStorage.getItem('listUserToChat') : '[]');

        listUserToChat.push(userId);
        localStorage.setItem('listUserToChat', JSON.stringify(listUserToChat));
        $('#list-users').append(`
            <div class="alert alert-primary alert-user" data-user-id="${userId}">
                <strong class="text-truncate">${username}</strong>
                <button type="button" class="close mr-1" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `);
        $('#search-group').val('');
        $('#dropdown-users').removeClass('show');
    });

    $(document).on('click', '[data-dismiss="alert"]', function() {
        let listUserToChat = JSON.parse(!!localStorage.getItem('listUserToChat') ? localStorage.getItem('listUserToChat') : '[]');
        const userId = $(this).parent().attr('data-user-id');
        const indexUser = listUserToChat.indexOf(userId);
        if (indexUser !== -1) {
            listUserToChat.splice(indexUser, 1);
        }
        localStorage.setItem('listUserToChat', JSON.stringify(listUserToChat));
    });

    $('#close-popup').on('click', function() {
        clearUsers();
    });

    $(document).on('click', '#start-chat', async function() {
        const members = JSON.parse(localStorage.getItem('listUserToChat') || '[]');
        
        console.log(members);
        clearUsers();
        await createRoom(accessToken, members);
    });

    $('#addGroupModal').on('hidden.bs.modal', function () {
        clearUsers();
    })
});

async function loadRooms(accessToken, page = 1) {
    const dataRooms = await axios.get(`https://chat-app-api.cleverapps.io/api/v1/rooms?page=${page}&limit=10`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    console.log(dataRooms);
    const rooms = dataRooms.data.data.map(room => {
        return `
            <div class="group">
                <img src="./images/user.png" />
                <div class="info" data-room-id=${room._id}>
                    <p>${room.name}</p>
                    <div>
                        <span class="content-msg text-truncate">${room.lastMessage ? room.lastMessage.content : '...'}</span>
                        <span class="time">${new Date(room.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    });
    if (!rooms || rooms.length === 0) {
        $('#rooms').off('scroll');
    }
    $('#rooms').append(rooms);
}

async function loadMessages(roomId, accessToken, lastMessageId = '', limit = 10) {
    const dataMessages = await axios.get(`https://chat-app-api.cleverapps.io/api/v1/rooms/${roomId}?lastMessageId=${lastMessageId}&limit=${limit}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    console.log(dataMessages);
    const roomName = dataMessages.data.data.name;
    let messages = dataMessages.data.data.messages.map((message, index) => {
        const ownerOfMsg = message.author._id;
        let classes = 'message';
        // if (index === message.length) {
        //     classes += ' last-message';
        // }
        if (ownerOfMsg === userId) {
            classes += ' me';
        }
        return `
            <div class="${classes}" data-message-id="${message._id}">
                <p>${message.content}</p>
                <span class='time'>${new Date(message.createdAt).toLocaleString()}</span>
            </div>
        `;
    });
    const members = dataMessages.data.data.members;
    const author = dataMessages.data.data.author;
    let statusUser = '';
    if (members.length === 1) {
        statusUser = 'Online'
    } else if (members.length === 2) {
        statusUser = members.every(members => members.isOnline) ? 'Online' : 'Offline';
    } else {
        statusUser = members.some(members => {
            if (members._id.toString() === author.toString()) {
                return false;
            }
            return members.isOnline;
        }) ? 'Online' : 'Offline';
    }
    localStorage.setItem('listMembersToChat', JSON.stringify(members, null, 2));
    $('.chat-box .header .group-info').html(`
        <div class="info">
            <img src="./images/user.png" />
            <p>${roomName}</p>
            &nbsp;<small id='status-room' class="${statusUser === 'Online' ? 'text-success' : 'text-secondary'}">${statusUser}</small>
        </div>
    `);
    if (!messages || messages.length === 0) {
        $('#messages').off('scroll');
        return;
    }
    messages = messages.reverse();
    $('#messages').prepend(messages);
}

async function loadUsers(name, accessToken) {
    const dataUsers = await axios.get(`https://chat-app-api.cleverapps.io/api/v1/users?page=${page}&limit=5&username=${name}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    console.log(dataUsers);
    let listUserToChat = JSON.parse(!!localStorage.getItem('listUserToChat') ? localStorage.getItem('listUserToChat') : '[]');

    const users = dataUsers.data.data.reduce((res, user) => {
        if (!listUserToChat.includes(user._id)) {
            res.push(`
                <a class="dropdown-item" href="javascript:void(0)" data-user-id="${user._id}">${user.username}</a>
            `);
        }
        return res;
    }, []);
    if (users.length === 0) {

    }
    $('#dropdown-users').html(users);
    
    if (users.length === 0) {
        $('#dropdown-users').removeClass('show'); 
        return;    
    } 
    $('#dropdown-users').addClass('show'); 
};

function scrollToBottom() {
    $(".chat-box .list").animate({ scrollTop: $(".chat-box .list").height() }, 500);
}

function clearUsers() {
    localStorage.setItem('listUserToChat', '');
    $('#list-users').html('');
}

async function createRoom(accessToken, members) {
    try {
        const dataRooms = await axios.post(`https://chat-app-api.cleverapps.io/api/v1/rooms`, {
            members
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        console.log(dataRooms);
        const room = dataRooms.data.data;
        if ($('[data-room-id="' + room._id + '"]').length > 0) {
            $('#addGroupModal').modal('hide');
            return;
        }
        const rooms = `
            <div class="group">
                <img src="./images/user.png" />
                <div class="info" data-room-id=${room._id}>
                    <p>${room.name}</p>
                    <div>
                        <span class="content-msg text-truncate">${room.lastMessage ? room.lastMessage.content : '...'}</span>
                        <span class="time">${new Date(room.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;;
        if (!rooms || rooms.length === 0) {
            $('#rooms').off('scroll');
        }
        $('#rooms').prepend(rooms);
        $('#addGroupModal').modal('hide');
    } catch (error) {
        alert(error.response.data.message);
    }
}
