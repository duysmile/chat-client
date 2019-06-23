const username = localStorage.getItem('userName');
const userId = localStorage.getItem('userId');
const LIMIT_PAGINATION = 10;
let page = 1;

$(document).ready(function() {
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
});

async function loadRooms(accessToken, page = 1) {
    const dataRooms = await axios.get(`http://localhost:3001/api/v1/rooms?page=${page}&limit=10`, {
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
    const dataMessages = await axios.get(`http://localhost:3001/api/v1/rooms/${roomId}?lastMessageId=${lastMessageId}&limit=${limit}`, {
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
    messages = messages.reverse();
    if (!messages || messages.length === 0) {
        $('#messages').off('scroll');
        return;
    }

    $('#messages').prepend(messages);
    $('.chat-box .header .group-info').html(`
        <div class="info">
            <img src="./images/user.png" />
            <p>${roomName}</p>
        </div>
    `);
}

function scrollToBottom() {
    $(".chat-box .list").animate({ scrollTop: $(".chat-box .list").height() }, 500);
}
