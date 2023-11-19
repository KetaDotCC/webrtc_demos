// Copyright 2023 a1147
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const sturn_server = 'stun:stun.ketanetwork.cc:3478'

/**
 * 
 * @param  {...any} params 
 */
function log(...params) {
    console.log(params);

    const elem = document.createElement('ul');
    elem.classList.add('list-group-item');
    elem.innerText = params.toString();
    document.getElementById('logs').appendChild(elem);
}

/**
 * 
 * @param {HTMLElement} localDomElement 
 * @returns {Promise<MediaStream>}
 */
function createMediaStream(localDomElement) {
    /** @type {Promise<MediaStream>} */
    let promise = new Promise((resolve, reject) => {
        navigator.getUserMedia({
            video: true,
            audio: false
        }, function(stream) {
            resolve(stream);
        }, function(err) {
            log('getUserMedia error:',err);
            reject(err);
        });
    });
    return promise;
}

/**
 * 
 * @param {HTMLElement} remoteDomElement 
 * @param {any} event
 */
function configureRemoteVideo(event, remoteDomElement) {
    const stream = event.stream;
    remoteDomElement.srcObject = stream;
    log('got remote video');
}

/**
 * @param {RTCPeerConnectionIceEvent} event 
 */
function handleIceCandidate(event) {
    const candidate =  event.candidate;
    /**@type {RTCPeerConnection} */
    const conn = event.target;
    if (candidate) {
        log('found candidate ', candidate.candidate);
        // 发送这个candidate给remote端
        const c = new RTCIceCandidate(candidate);
        /**@type {RTCPeerConnection} */
        let peer;
        if (conn === window.local_pc) {
            peer = window.remote_pc;
            log('add ice candidate', c.address , ' to remote');
        } else {
            peer = window.local_pc;
            log('add ice candidate', c.address ,' to local');
        }
        peer.addIceCandidate(c).then(() => {
            log('connect ', c.address ,' success!');
        }).catch((err) => {
            log('connect ice candidate failed, ', err)
        });
    }
}

/**
 * 
 * @param {Event} event 
 */
function handleIceConnectionStateChange(event) {
    log('iceConnectionStateChange:',event);
}

/**
 * 
 * @param {RTCTrackEvent} event 
 * @param {HTMLElement} dom 
 */
function handleRemoteMediaStream(event, dom) {
    const mediaStream = event.streams[0];
    dom.srcObject = mediaStream;
    log('got remote media stream', event.streams);
}

/**
 * @param {MediaStream} stream 
 * @param {boolean} createOffer
 * @param {HTMLElement} dom 
 * @returns {RTCPeerConnection}
 */
function connectToTurn(stream, dom, createOffer) {
    log('connectToTurn...');
    let pc = new RTCPeerConnection({
        iceServers: [
            {
                urls: sturn_server
            }
        ]
    });
    pc.addEventListener('icecandidate', handleIceCandidate);
    pc.addEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
    pc.addEventListener('track', (event) => handleRemoteMediaStream(event, dom));
    
    pc.addStream(stream);
    if (createOffer) {
        log('creating offer to remote');
        pc.createOffer({offerToReceiveVideo: true}).then((desc) => {
            log('local_pc --(description)--> remote_pc');
            // 设置为本地的description
            pc.setLocalDescription(desc);
            // 设置远端的，这个demo没有借助信令服务器
            /**@type {RTCPeerConnection} */
            let remote_pc = window.remote_pc;
            /**@type {RTCPeerConnection} */
            let local_pc = window.local_pc;
            remote_pc.setRemoteDescription(desc);
            remote_pc.createAnswer({}).then((description) => {
                log('remote_pc --(description)--> local_pc');
                remote_pc.setLocalDescription(description);
                // remote发送给local
                local_pc.setRemoteDescription(description);
            })
            });
    }
    return pc
}