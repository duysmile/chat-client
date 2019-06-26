const SERVER_HOST = 'http://localhost:3001';
const accessToken = localStorage.getItem('access_token');
const socket = io(`${SERVER_HOST}?token=${accessToken}`);

$(document).ready(function() {
    socket.on('error', function(err) {
        console.error(err);
    });
    
    socket.on('messages', function(data) {
        switch(data.action) {
            case 'RECEIVE': {
                console.log(data);
                const roomId = localStorage.getItem('roomId');
                if (data.message.room.toString() === roomId) {
                    $('#messages').append(`
                        <div class="message">
                            <p>${data.message.content}</p>
                            <span class='time'>${new Date(data.message.createdAt).toLocaleString()}</span>
                        </div>
                    `);
                    scrollToBottom();
                } else {

                }
                return;
            }
            case 'RECEIVE_TYPING': {
                console.log('typing');
                $('#typing').remove();
                const roomId = localStorage.getItem('roomId');
                console.log(roomId, data.message);
                if (data.roomId.toString() === roomId) {
                    $('#messages').append(`
                        <div id="typing" class="message">
                            <p>...</p>
                        </div>
                    `);
                    scrollToBottom();
                }
                return;
            }
            case 'RECEIVE_DONE_TYPING': {
                console.log('done-typing');
                const roomId = localStorage.getItem('roomId');
                if (data.roomId.toString() === roomId) {
                    $('#typing').remove();
                }
                return;
            }
            default:
                return;
        }
    });

    socket.on('status', function(data) {
        const listMembers = JSON.parse(localStorage.getItem('listMembersToChat'));
        switch(data.action) {
            case 'ONLINE': {
                const memberOnline = listMembers.find(member => member._id.toString() === data.data);
                if (!!memberOnline) {
                    memberOnline.isOnline = true;
                    localStorage.setItem('listMembersToChat', JSON.stringify(listMembers, null, 2));
                    $('#status-room').text('Online');
                    $('#status-room').addClass('text-success');
                    $('#status-room').removeClass('text-secondary');
                }
                break;
            }
            case 'OFFLINE': {
                const membersOnline = listMembers.filter(member => member.isOnline);
                const memberOnline = membersOnline.find(member => member._id.toString() === data.data);
                if (!!memberOnline) {
                    memberOnline.isOnline = false;
                    localStorage.setItem('listMembersToChat', JSON.stringify(listMembers, null, 2));
                    
                    if (membersOnline.length === 2) {
                        $('#status-room').text('Offline');
                        $('#status-room').removeClass('text-success');
                        $('#status-room').removeClass('text-secondary');
                    }
                }
                break;
            }
        }
    });
    
    let doneTypingTimer;
    let typingTimer;
    $('#input-message').on('input', function(event) {
        const roomId = localStorage.getItem('roomId');
        if (!typingTimer) {
            socket.emit('messages', {
                roomId,
                action: 'SEND_TYPING'
            }, function(err, callback) {
            if (err) {
                alert('Oops, something went wrong!');
                return;
            }
            console.log('send typing') ;
            });
        }
        clearTimeout(typingTimer);
        clearTimeout(doneTypingTimer);
    
        typingTimer = setTimeout(function() {
            socket.emit('messages', {
                roomId,
                action: 'SEND_TYPING'
            }, function(err, callback) {
                if (err) {
                    alert('Oops, something went wrong!');
                    return;
                }
            });
        }, 800);
    });

    $('#input-message').on('keyup', function(event) {
        clearTimeout(doneTypingTimer);
        const roomId = localStorage.getItem('roomId');
        doneTypingTimer = setTimeout(function() {
            socket.emit('messages', { 
                roomId,
                action: 'SEND_DONE_TYPING' 
            }, function(err, callback) {
            if (err) {
                alert('Oops, something went wrong!');
                return;
            }
            typingTimer = null;
            console.log('send done') 
            });
        }, 800);
    });

    $('form').on('submit', function(event) {
        event.preventDefault();
        const msg = $('#input-message').val().trim();
        const roomId = localStorage.getItem('roomId');
        if (msg === '' || !roomId) {
            return;
        }
        socket.emit('messages', {
            action: 'SEND',
            message: msg,
            room: roomId
        }, function(error, data) {
            console.log(data);
            if (error) {
                alert('Oops, something when wrong!');
                return;
            }
            
            $('#messages').append(`
                <div class="message me">
                    <p>${data.content}</p>
                    <span class='time'>${new Date(data.createdAt).toLocaleString()}</span>
                </div>
            `);
            scrollToBottom();
    
            clearTimeout(typingTimer);
            clearTimeout(doneTypingTimer);
            socket.emit('messages', {
                roomId,
                action: 'SEND_DONE_TYPING'
            }, function(err, callback) {
            if (err) {
                alert('Oops, something went wrong!');
                return;
            }
            typingTimer = null;
            console.log('send done') 
            });
        });
        $('#input-message').val('');
    });
});

function scrollToBottom() {
    $(".chat-box .list").animate({ scrollTop: $(".chat-box .list").height() }, 500);
}
