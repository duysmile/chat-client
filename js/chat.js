let username = '';

$(document).ready(function() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        window.location.href = '/';
    }

    loadRooms(accessToken).then(res => {
        $(document).on('click', '.info[data-room-id]', function(event) {
            const roomId = $(this).attr('data-room-id');
            loadMessages(roomId, accessToken);
        });
    }).catch(err => {
        console.error(err);
        window.location.href = '/';
    });
    
});

async function loadRooms(accessToken, lastRoomId, limit = 10) {
    const dataRooms = await axios.get('http://localhost:3001/api/v1/rooms', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    console.log(dataRooms);
    const rooms = dataRooms.data.data.map(room => {
        username = room.author.username;
        return `
            <div class="group">
                <img src="./images/user.png" />
                <div class="info" data-room-id=${room._id}>
                    <p>${room.name}</p>
                    <div>
                        <span class="content-msg">${room.lastMessage ? room.lastMessage.content : '...'}</span>
                        <span class="time">${new Date(room.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    });
    $('#rooms').append(rooms);
    $('#username').html(username);
}

async function loadMessages(roomId, accessToken, lastMessageId, limit = 10) {
    const dataMessages = await axios.get(`http://localhost:3001/api/v1/rooms/${roomId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    console.log(dataMessages);
    const roomName = dataMessages.data.data.name;
    let messages = dataMessages.data.data.messages.map((message, index) => {
        const ownerOfMsg = message.author.username;
        let classes = 'message';
        // if (index === message.length) {
        //     classes += ' last-message';
        // }
        if (ownerOfMsg === username) {
            classes += ' me';
        }
        return `
            <div class="${classes}">
                <p>${message.content}</p>
                <span class='time'>${new Date(message.createdAt).toLocaleString()}</span>
            </div>
        `;
    });
    messages = messages.reverse();
    $('#messages').html(messages);
    $('.chat-box .header').html(`
        <div class="info">
            <img src="./images/user.png" />
            <p>${roomName}</p>
        </div>
    `);
    // <div class="header">
    //     <div class="info">
    //         <img src="./images/user.png" />
    //         <p>Ngọc Sơn</p>
    //     </div>
    // </div>
    // <div class="list">
    //     <div class="message">
    //         <p>This is a generator for text fonts of the "cool" variety. I noticed people were trying to find a generator like fancy letters, but were ending up on actual font sites</p>
    //         <span>15:10</span>
    //     </div>
    //     <div class="message me">
    //         <p>This is a generator for text fonts of the "cool" variety.</p>
    //         <span>15:15</span>
    //     </div>
    // </div>
}
