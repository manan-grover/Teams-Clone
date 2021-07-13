// initialising socket io
const socket = io('/')

const videoGrid = document.getElementById('video-grid') // video grid of video call
const inGrid = document.getElementById('pre-grid') // video grid before joining the call

// initialising peer connection
const myPeer = new Peer(undefined, {
    path: 'peerjs',
    host: 'engage-project.herokuapp.com',
    port: '443'
})

let myID // my user ID
let peers = {} // map of div component in video grid
let myVideoStream // my video stream
let myName // my user name
let captions = false // is caption on?
let cap = {} // caption of each user
let aud = false // is audio on?
let joined = false // is user joined by video call?
let chat = false // is chat on?
let part = {} // participants in the chat

// initialising speech to text web API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = new SpeechRecognition()
recognition.interimResults = true
recognition.start()

// user joined video call
socket.on('user-connected', user => {
  if(joined){
    connectToNewUser(user, myVideoStream)
  }
})

// call recieved
myPeer.on('call', call => {
    call.on('stream', userVideoStream => {
        addVideoStream(call.metadata.id, call.metadata.name, userVideoStream, videoGrid, call.metadata.on, call.metadata.mon)
    })
    call.answer(myVideoStream)
})

// user disconnected from videp call
socket.on('user-disconnected', userId => {
    if(peers[userId]){
      peers[userId].remove()
      peers[userId].childNodes[0].srcObject = null
      delete peers[userId]
    }
    if(part[userId]){
      socket.emit('leave-chat', userId)
    }
})

// user entered the room
myPeer.on('open', id => {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        myVideoStream = stream
        aud = true;
        addVideoStream(myID, myName, myVideoStream, inGrid, myVideoStream.getVideoTracks()[0].enabled)
    })
    myID = id
})

// make a connetion with joined user
function connectToNewUser(user, stream) {
    let call = myPeer.call(user.id, stream, {
        metadata: {"id" : myID, "name" : myName, "on" : myVideoStream.getVideoTracks()[0].enabled}
    })
    call.on('stream', userVideoStream => {
        addVideoStream(user.id, user.name, userVideoStream, videoGrid, user.on, user.mon)
    })
}

// add user video stream to grid
function addVideoStream(id, name, stream, grid, on, mon) {
    let group = document.createElement('div')
    let video = document.createElement('video')
    let image = document.createElement('img');
    let text = document.createElement('span')
    let mic = document.createElement('i')
    text.innerHTML=name
    text.className="names"
    image.src = "images/sample.png"
    if(on){
      video.className = 'show'
      image.className = 'hide'
    }else{
      video.className = 'hide'
      image.className = 'show'
    }
    if(mon){
      mic.className = "fas fa-microphone fa-2x mic"
    }else{
      mic.className = "fas fa-microphone-slash fa-2x mic"
    }
    if(peers[id]){
      peers[id].remove()
      peers[id].childNodes[0].srcObject = null
      delete peers[id]
    }
    if(id == myID){
      video.muted = true
    }
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
    if(grid == inGrid){
      video.style.height="420px"
      video.style.width="560px"
      image.style.height="420px"
      image.style.width="560px"
    }
    group.appendChild(video)
    group.appendChild(image)
    if(grid != inGrid){
      group.style.width="400px"
      group.style.height="300px"
      group.appendChild(text)
      group.appendChild(mic)
      $(group).draggable()
    }
    group.style.margin="30px"
    peers[id] = group
    grid.append(peers[id])
}

// join to video call
const join = () => {
    myName = $('#name').val()
    document.getElementById('empty_input').style.display="none"
    document.getElementById('non_alpha_input').style.display="none"
    document.getElementById('long_input').style.display="none"
    if(myName.length == 0){
      document.getElementById('empty_input').style.display="block"
    }else if((myName[0] < 'a' || myName[0] > 'z') && (myName[0] < 'A' || myName[0] > 'Z')){
      document.getElementById('non_alpha_input').style.display="block"
    }else if(myName.length > 20){
      document.getElementById('long_input').style.display="block"
    }else{
      document.getElementById('pre').style.display="none"
      document.getElementById('main').style.display="block"
      document.getElementById('chat').style.display="block"
      document.getElementById('leave_chat_button').style.display="none"
      socket.emit('join-room', ROOM_ID, myID, myName, myVideoStream.getVideoTracks()[0].enabled, myVideoStream.getAudioTracks()[0].enabled)
      socket.emit('join-chat', ROOM_ID, myID, myName)
      addVideoStream(myID, myName, myVideoStream, videoGrid, myVideoStream.getVideoTracks()[0].enabled, myVideoStream.getAudioTracks()[0].enabled)
      joined = true
    }
}

// join to chat
const joinChat = () => {
    myName = $('#name').val()
    document.getElementById('empty_input').style.display="none"
    document.getElementById('non_alpha_input').style.display="none"
    document.getElementById('long_input').style.display="none"
    if(myName.length == 0){
      document.getElementById('empty_input').style.display="block"
    }else if((myName[0] < 'a' || myName[0] > 'z') && (myName[0] < 'A' || myName[0] > 'Z')){
      document.getElementById('non_alpha_input').style.display="block"
    }else if(myName.length > 20){
      document.getElementById('long_input').style.display="block"
    }else{
      document.getElementById('chat').style.display="block"
      document.getElementById('participants').style.display="block"
      document.getElementById('chat').className="semi_chat"
      socket.emit('join-chat', ROOM_ID, myID, myName)
      document.getElementById('join_chat_button').style.display="none"
      document.getElementById('pre').style.display="none"
    }
}

// copy meeting link
const copy = () => {
  navigator.clipboard.writeText(window.location.href)
  let el = document.getElementById('copy_button')
  el.style.backgroundColor="rgba(255, 255, 255, 0.7)"
  el.innerHTML="Meeting Link Copied!"
  el.style.color="black"
  el.style.marginLeft="14%"
}

// leave the chat
const leaveChat = () => {
  document.getElementById('chat').style.display="none"
  document.getElementById('participants').style.display="none"
  socket.emit('leave-chat', myName)
  $("ul").empty()
  document.getElementById('post').style.display="block"
}

// send message
let chat_message = $('#chat_message')
$('html').keydown(function (e) {
  if (e.which == 13 && chat_message.val().length !== 0) {
    socket.emit('message', {'val' : chat_message.val(), 'name' : myName});
    chat_message.val('')
  }
});

// someone sent a message
socket.on('createMessage', message => {
  $("ul").append(`<li class="message"><b>${message.name}:</b><br/>${message.val}</li>`);
  scrollToBottom()
})

// user joined the chat
socket.on('user-joined-chat', (id, name) => {
  socket.emit('part', id, myID, myName);
  if(id!=myID){
    part[id] = document.createElement('span')
    part[id].innerHTML=name
    part[id].style.display='block'
    part[id].style.paddingLeft="5%"
    document.getElementById('participants').append(part[id])
    $("ul").append(`<li class="message">${name} joined the chat</li>`); 
  }
})

// getting participants that are already in the chat
socket.on('part-already', (id, uid, uname) => {
  if(id==myID){
    part[uid] = document.createElement('span')
    part[uid].innerHTML=uname
    part[uid].style.display='block'
    part[uid].style.paddingLeft="5%"
    document.getElementById('participants').append(part[uid])
    $("ul").append(`<li class="message">${uname} joined the chat</li>`);
  }
})

// user left the chat
socket.on('user-left-chat', id => {
  if(part[id]){
    $("ul").append(`<li class="message">${part[id].innerHTML} left the chat</li>`);
    part[id].remove()
    delete part[id]
  }
})

// user turned off the video
socket.on('user-videoOff', userId => {
  peers[userId].childNodes[0].className="hide"
  peers[userId].childNodes[1].className="show"
})

// user turned on the video
socket.on('user-videoOn', userId => {
  peers[userId].childNodes[0].className="show"
  peers[userId].childNodes[1].className="hide"
})

// user turned off the audio
socket.on('user-audioOff', userId => {
  peers[userId].childNodes[3].className="fas fa-microphone-slash fa-2x mic"
})

// user turned on the audio
socket.on('user-audioOn', userId => {
  peers[userId].childNodes[3].className="fas fa-microphone fa-2x mic"
})

// scroll to last message in the chat
const scrollToBottom = () => {
  var d = $('.main__chat_window');
  d.scrollTop(d.prop("scrollHeight"));
}

// leave the video call
const leave = () => {
  document.getElementById('main').style.display="none"
  document.getElementById('chat').style.display="none"
  document.getElementById('post').style.display="block"
  for(var i in peers){
    peers[i].remove()
    peers[i].childNodes[0].srcObject = null
    delete peers[i]
  }
  socket.emit('leave', myID)
}

// toggle your audio
const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    aud = false
    setAudioOff()
    socket.emit('audioOff', myID)
    if(peers[myID].childNodes[3]){
      console.log('here')
      peers[myID].childNodes[3].className="fas fa-microphone-slash fa-2x mic"
    }
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    aud = true
    setAudioOn()
    socket.emit('audioOn', myID)
    if(peers[myID].childNodes[3]){
      peers[myID].childNodes[3].className="fas fa-microphone fa-2x mic"
    }
  }
}

// toggle your video
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    peers[myID].childNodes[0].className="hide"
    peers[myID].childNodes[1].className="show"
    socket.emit('videoOff', myID)
    setVideoOff()
  } else {
    peers[myID].childNodes[0].className="show"
    peers[myID].childNodes[1].className="hide"
    myVideoStream.getVideoTracks()[0].enabled = true;
    socket.emit('videoOn', myID)
    setVideoOn()
  }
}

// toggle your captions
const caption = () => {
  if(captions){
    document.getElementById('main_left').style.display="none"
    setCaptionOn()
    captions = false
  }else{
    document.getElementById('main_left').style.display="block"
    setCaptionOff()
    captions = true
  }
}

// recognition found by web API
recognition.addEventListener("result", (event) => {
  if(aud && joined){
    const current = event.resultIndex;
    let transcript = event.results[current][0].transcript;
    transcript = myName + ": " + transcript
    socket.emit('captionOn', transcript)
    if(event.results[0].isFinal){
      setTimeout(recognition.stop(), 3000)
    }
  }else{
    recognition.stop()
  }
})

// add captions on the room
socket.on('add-captions', data => {
  if(cap[data.id]){
    cap[data.id].nodeValue=data.captions
  }else{
    cap[data.id] = document.createTextNode(data.captions)
    document.getElementById('captions').append(cap[data.id])
  }
  if(peers[data.id]){
    $(peers[data.id].childNodes[0]).css('border-style', 'solid');
    $(peers[data.id].childNodes[1]).css('border-style', 'solid');
  }
})

// remove captions from the room
socket.on('remove-captions', id => {
  if(peers[id]){
    $(peers[id].childNodes[0]).css('border-style', 'none');
    $(peers[id].childNodes[1]).css('border-style', 'none');
  }
  if(cap[id]){
    cap[id].remove()
    delete cap[id]
  }
})

// recognition ended so refresh the feed
recognition.addEventListener("end", () => {
  socket.emit('captionOff')
  recognition.start()
})

// caption icon on
const setCaptionOn = () => {
  document.getElementById('main_captions').className="fas fa-closed-captioning fa-3x main_icon"
}

// caption icon off
const setCaptionOff = () => {
  document.getElementById('main_captions').className="fas fa-closed-captioning fa-3x main_icon glow"
}

// video icon off
const setVideoOff = () => {
  document.getElementById('pre_camera').className="fas fa-video-slash fa-2x"
  document.getElementById('main_camera').className="fas fa-video-slash fa-3x main_icon"
}

// video icon on
const setVideoOn = () => {
  document.getElementById('pre_camera').className="fas fa-video fa-2x"
  document.getElementById('main_camera').className="fas fa-video fa-3x main_icon"
}

// audio icon off
const setAudioOff = () => {
  document.getElementById('pre_microphone').className="fas fa-microphone-slash fa-2x"
  document.getElementById('main_microphone').className="fas fa-microphone-slash fa-3x main_icon"
}

// audio icon on
const setAudioOn = () => {
  document.getElementById('pre_microphone').className="fas fa-microphone fa-2x"
  document.getElementById('main_microphone').className="fas fa-microphone fa-3x main_icon"
}

// toggle chat navigator
const openCloseChat = () => {
  if(chat){
    document.getElementsByClassName("full_chat")[0].style.width = "0%"
    document.getElementById('main_chat').className="fas fa-comment-alt fa-3x main_icon"
    chat = false
  }else{
    document.getElementsByClassName("full_chat")[0].style.width = "15%"
    document.getElementById('main_chat').className="fas fa-comment-alt fa-3x main_icon glow"
    chat = true
  }
}

