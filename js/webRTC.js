let caller;
let localStream;

function settingWebRTC(socket, caller) {// get for any browser
    getRTCPeerConnection();
    getRTCSessionDescription();
    getRTCIceCandicate();

    // init caller
    prepareCaller();
}

function prepareCaller() {
    caller = new window.RTCPeerConnection();

    caller.onicecandicate = function(evt) {
        if (!evt.icecandicate) {
            return;
        }

        console.log('onicecandicate called');
        onIceCandicate(caller, evt);
    }

    caller.onaddstream = function(evt) {
        console.log('onaddstream called');
        const videoTag = document.createElement('video');
        if (window.URL) {
            videoTag.srcObject = evt.stream;
        } else {
            videoTag.src = evt.stream;
        }
        console.log(JSON.stringify(evt.stream), evt.stream);
        videoTag.autoplay    = true;
        videoTag.muted       = true;
        videoTag.playsinline = true;
        $('.videos').append(videoTag);
        // videoTag.onloadedmetadata = function() {
        //     videoTag.play();
        // };
    }
}

function onIceCandicate(peer, evt) {
    if (evt.candicate) {
        const roomId = localStorage.getItem('roomId');
        socket.emit('video', {
            action: 'CALL',
            candicate: evt.candicate,
            room: roomId
        })
    }
}

function getRTCIceCandicate() {
    window.RTCIceCandicate = 
        window.RTCIceCandicate ||
        window.webkitRTCIceCandicate ||
        window.mozRTCIceCandicate ||
        window.msRTCIceCandicate;
    
    return window.RTCIceCandicate;
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

function getCam() {
    return navigator.mediaDevices.getUserMedia({
        video: true,
        audio:true
    });
}

function callUser(socket, userId, roomId) {
    getCam()
        .then(stream => {
            // get localStream
            const videoTag = document.getElementById('self-view');
            $('#self-view').addClass('visible-video');
            videoTag.srcObject = stream;

            toggleEndCallButton();
            caller.addStream(stream);
            localUserMedia = stream;
            caller.createOffer().then(function(desc) {
                caller.setLocalDescription(new RTCSessionDescription(desc));
                socket.emit('video', {
                    action: 'SDP',
                    sdp: desc,
                    room: roomId,
                    from: userId
                })
            });
        })
        .catch((err) => {
            console.error('error', err);
        });
}

function toggleEndCallButton() {
    // if (document.getElementById('endCall').style.display === 'block') {
    //     document.getElementById('endCall').style.display = 'none';
    // } else {
    //     document.getElementById('endCall').style.display = 'block';
    // }
}
