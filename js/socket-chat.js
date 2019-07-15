const SERVER_HOST = 'http://localhost:3001';
const accessToken = localStorage.getItem('access_token');
const socket = io(`${SERVER_HOST}?token=${accessToken}`);

const mediaStreamConstraints = {
    video: true,
    // audio: true
};
const offerOptions = {
    offerToReceiveVideo: 1,
};
let connections = [];
let localStream;

function settingWebRTC() {
    // get for any browser
    getRTCPeerConnection();
    getRTCSessionDescription();
    getRTCIceCandidate();
}

function gotRemoteStream(event, userId) {
    const remoteVideo  = document.createElement('video');
    console.log('stream', event.stream);
    remoteVideo.setAttribute('data-socket', userId);
    remoteVideo.srcObject   = event.stream;
    remoteVideo.autoplay    = true;
    remoteVideo.muted       = true;
    remoteVideo.playsinline = true;
    document.querySelector('.videos').appendChild(remoteVideo);
}

function getRTCIceCandidate() {
    window.RTCIceCandidate = 
        window.RTCIceCandidate ||
        window.webkitRTCIceCandidate ||
        window.mozRTCIceCandidate ||
        window.msRTCIceCandidate;
    
    return window.RTCIceCandidate;
}

function getRTCPeerConnection() {
    window.RTCPeerConnection = 
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.msRTCPeerConnection;

    return window.RTCPeerConnection;
}

function getRTCSessionDescription() {
    window.RTCSessionDescription =
        window.RTCSessionDescription ||
        window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription ||
        window.msRTCSessionDescription;
    
    return window.RTCSessionDescription;
}

function gotMediaSuccess(stream) {
    // get localStream
    const videoTag = document.getElementById('self-view');
    $('#self-view').addClass('visible-video');
    console.log('here')
    videoTag.srcObject = stream;
    localStream = stream;
}

function getCamera(callback) {
    return navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotMediaSuccess)
        .then(callback)
        .catch(handleError);
}

function handleError(err) {
    console.error(err);
}

function toggleEndCallButton() {
    // if (document.getElementById('endCall').style.display === 'block') {
    //     document.getElementById('endCall').style.display = 'none';
    // } else {
    //     document.getElementById('endCall').style.display = 'block';
    // }
}

function gotMessageFromSignaling(data) {
    const fromId = data.fromId;
    const userId = localStorage.getItem('userId');
    if (fromId !== userId) {
        switch(data.type) {
            case 'sdp': {
                let isAcceptCalling = true;
                if (!localStream) {
                    isAcceptCalling = confirm(`${fromId} want to call you? Do you want to accept?`);
                }
                if (isAcceptCalling && !!data.description) {
                    getCamera(function() {
                        receiveSdp(data, fromId);
                    });
                }
                break;
            }
            case 'candidate': {
                if (!!data.candidate) {
                    if (!localStream) {
                        getCamera(function() {
                            gotIceCandidate(data, fromId);
                        });
                    } else {
                        gotIceCandidate(data, fromId);
                    }
                }
                break;
            }
        }
    }
}

$(document).ready(function() { 
    socket.on('connect', () => {
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
                    }
                    const roomIdFromServer = data.roomId;
                    const roomName = data.roomName;
                    $(`[data-room-id='${roomIdFromServer}']`).parent().remove();
                    const roomData = `
                        <div class="group">
                            <img src="./images/user.png" />
                            <div class="info" data-room-id=${roomIdFromServer}>
                                <p>${roomName}</p>
                                <div>
                                    <span class="content-msg text-truncate font-weight-bold">${data.message.content}</span>
                                    <span class="time">${new Date(data.message.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>`;
                    $('#rooms').prepend(roomData);
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
            const listMemberStr = localStorage.getItem('listMembersToChat');
            const listMembers = listMemberStr ? JSON.parse(localStorage.getItem('listMembersToChat')): [];
            switch(data.action) {
                case 'ONLINE': {
                    const memberOnline = listMembers.find(member => member._id.toString() === data.data);
                    if (!!memberOnline) {
                        memberOnline.isOnline = true;
                        localStorage.setItem('listMembersToChat', JSON.stringify(listMembers, null, 2));
                        $('#status-room').text('Online');
                        $('#status-room').addClass('text-success');
                        $('#status-room').removeClass('text-secondary');
                        $('#make-call').removeAttr("disabled");
                        $('#make-call i').removeClass('text-secondary').addClass('text-primary');
                        // createConnections([{
                        //     _id: data.data
                        // }]);
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
                            $('#make-call').attr('disabled', 'disabled');
                            $('#make-call i').addClass('text-secondary').removeClass('text-primary');
                        }
                    }
                    break;
                }
            }
        });

        socket.on('video', function(data) {
            switch(data.action) {
                case 'signaling': {
                    gotMessageFromSignaling(data);
                }
            }
        });
        
        let doneTypingTimer;
        let typingTimer;
        $('#input-message').on('input', function(event) {
            const roomId = localStorage.getItem('roomId');
            $(`[data-room-id=${roomId}] .font-weight-bold`).removeClass('font-weight-bold');
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
    
        settingWebRTC();
    
        $(document).on('click', '#make-call', function() {
            const listMemberStr = localStorage.getItem('listMembersToChat');
            const listMembers = listMemberStr ? JSON.parse(localStorage.getItem('listMembersToChat')): [];
            const listMembersOnline = listMembers.filter(member => member.isOnline);
            if (listMembersOnline.length === 0) {
                console.log('No user online');
                return false;
            }
            
            // TODO: call User need userIds online
            getCamera(function() {
                const userId = localStorage.getItem('userId');
                createConnections(listMembersOnline, userId);
            });
        })
    });
});

function receiveSdp(data, fromId) {
    console.log('receive sdp from ', fromId, connections[fromId]);
    if (!connections[fromId]) {
        const listMemberStr = localStorage.getItem('listMembersToChat');
        const listMembers = listMemberStr ? JSON.parse(localStorage.getItem('listMembersToChat')): [];
        const listMemberOnline = listMembers.filter(member => member.isOnline);
        createConnections(listMemberOnline, fromId);
    }

    setTimeout(function() {
        connections[fromId].setRemoteDescription(new RTCSessionDescription(data.description))
        .then(() => {
            console.log('description type', data.description.type);
            if (data.description.type === 'offer') {
                connections[fromId].createAnswer()
                    .then(description => {
                        connections[fromId].setLocalDescription(description)
                            .then(() => {
                                console.log('send answer to ', fromId);
                                socket.emit('video', {
                                    action: 'signaling',
                                    type: 'sdp',
                                    toId: fromId,
                                    description: connections[fromId].localDescription
                                })
                            })
                            .catch(handleError)
                    })
                    .catch(handleError)
            }
        })
        .catch(handleError)
    }, 0);
}

function gotIceCandidate(data, fromId) {
    if(!connections[fromId] || !connections[fromId].remoteDescription){
        setTimeout(function() {
            console.log('receive candidate from ', fromId);
            connections[fromId].addIceCandidate(new RTCIceCandidate(data.candidate))
                .catch(handleError);
        }, 2000);
    } else {
        console.log('receive candidate from ', fromId);
        connections[fromId].addIceCandidate(new RTCIceCandidate(data.candidate))
    }
}

function createConnections(listUserOnline, fromId) {
    listUserOnline.forEach(user => {
        if (!connections[user._id]) {
            connections[user._id] = new RTCPeerConnection(mediaStreamConstraints);
            connections[user._id].onicecandidate = onIceCandidate(user._id);
            connections[user._id].onaddstream = onAddStream(user._id);
            connections[user._id].addStream(localStream);
        }
    });

    console.log(connections);
    if (listUserOnline.length >= 2) {
        createOfferConnection(fromId);
    }
}

function onIceCandidate(userId) {
    const callback = function(event) {
        if (!!event.candidate) {
            console.log('send candidate to ', userId);
            socket.emit('video', {
                action: 'signaling',
                type: 'candidate',
                candidate: event.candidate,
                toId: userId
            });
        }
    }

    return callback;
}

function onAddStream(userId) {
    const callback = function(event) {
        console.log('add stream');
        gotRemoteStream(event, userId);
    }

    return callback;
}

function createOfferConnection(userId) {
    connections[userId].createOffer(offerOptions)
        .then(description => {
            connections[userId].setLocalDescription(description)
                .then(() => {
                    console.log('create offer to', userId);
                    socket.emit('video', {
                        action: 'signaling',
                        type: 'sdp',
                        description: connections[userId].localDescription,
                        toId: userId
                    });
                })
                .catch(handleError);
        })
}

function scrollToBottom() {
    $(".chat-box .list").animate({ scrollTop: $(".chat-box .list").height() }, 500);
}
