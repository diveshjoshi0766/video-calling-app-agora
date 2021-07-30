import React from 'react';
import AgoraRTC from "agora-rtc-sdk";
import $ from 'jquery';

var rtc = {
    client: null,
    joined: false,
    published: false,
    localStream: null,
    remoteStreams: [],
    params: {},
    localAudioTrack: null,
};

// Options for joining a channel
var option = {
    appID: "a86a315fcd594277ac1ffb6cd6990fed",
    channel: "video-calling",
    uid: null,
    token: "",
    key: '',
    secret: ''
}

var mainStreamId; // reference to main stream
var cameraVideoProfile = '480_4'; 

// var audioControl = document.body.addEventListener("touchstart");

function joinChannel(role) {
    // Create a client
    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "h264" });
    // Initialize the client
    rtc.client.init(option.appID, function () {
        console.log("init success");
        // Join a channel
        joinChannels();
        rtc.client.join(option.token ?
            option.token : null,
            option.channel, option.uid ? +option.uid : null, function (uid) {
                console.log("join channel: " + option.channel + " success, uid: " + uid);
                rtc.params.uid = uid;
                if (role === "host") {

                    document.getElementById("remote_video_").disabled = true;

                    rtc.client.setClientRole("host");
                    // Create a local stream

                    rtc.localStream = AgoraRTC.createStream({
                        streamID: rtc.params.uid,
                        audio: true,
                        video: true,
                    })

                    // Initialize the local stream
                    rtc.localStream.init(function () {
                        console.log("init local stream success");
                        rtc.localStream.play("local_stream");
                        rtc.client.publish(rtc.localStream, function (err) {
                            console.log("publish failed");
                            console.error(err);
                        })
                    }, function (err) {
                        console.error("init local stream failed ", err);
                    });

                    rtc.client.on("connection-state-change", function (evt) {
                        console.log("audience", evt)
                    })

                }
                if (role === "audience") {

                    document.getElementById("local_stream").disabled = true;

                    rtc.client.on("connection-state-change", function (evt) {
                        console.log("audience", evt)
                    })

                    rtc.client.on("stream-added", function (evt) {
                        var remoteStream = evt.stream;
                        var id = remoteStream.getId();
                        if (id !== rtc.params.uid) {
                            rtc.client.subscribe(remoteStream, function (err) {
                                console.log("stream subscribe failed", err);
                            })
                        }
                        console.log('stream-added remote-uid: ', id);
                    });

                    rtc.client.on("stream-removed", function (evt) {
                        var remoteStream = evt.stream;
                        var id = remoteStream.getId();
                        console.log('stream-removed remote-uid: ', id);
                    });


                    rtc.client.on("stream-subscribed", function (evt) {
                        var remoteStream = evt.stream;
                        var id = remoteStream.getId();
                        mainStreamId = id;
                        remoteStream.play("remote_video_", {muted: true});

                        console.log('stream-subscribed remote-uid: ', id);
                    })

                    rtc.client.on("mute-audio", function (evt) {
                        toggleVisibility('#' + evt.uid + '_mute', true);
                      });
                      
                    rtc.client.on("unmute-audio", function (evt) {
                        toggleVisibility('#' + evt.uid + '_mute', false);
                      });
                      
                      // show user icon whenever a remote has disabled their video
                    rtc.client.on("mute-video", function (evt) {
                        var remoteId = evt.uid;
                        // if the main user stops their video select a random user from the list
                        if (remoteId !== mainStreamId) {
                          // if not the main vidiel then show the user icon
                          toggleVisibility('#' + remoteId + '_no-video', true);
                        }
                      });
                      
                    rtc.client.on("unmute-video", function (evt) {
                        toggleVisibility('#' + evt.uid + '_no-video', false);
                      });
                      

                    rtc.client.on("stream-unsubscribed", function (evt) {
                        var remoteStream = evt.stream;
                        var id = remoteStream.getId();
                        remoteStream.pause("remote_video_");
                        console.log('stream-unsubscribed remote-uid: ', id);
                    })
                }
            }, function (err) {
                console.error("client join failed", err)
            })

    }, (err) => {
        console.error(err);
    });
}

function leaveEventHost(params) {
    rtc.client.unpublish(rtc.localStream, function (err) {
        console.log("publish failed");
        alert('You left the meeting as Host')
        console.error(err);
    })
    rtc.client.leave(function (ev) {
        console.log(ev)
    })
}

function leaveEventAudience(params) {
    rtc.client.leave(function () {
        console.log("client leaves channel");
        alert('Left the meeting as an audience')
    }, function (err) {
        console.log("client leave failed ", err);
    })
}

function joinChannels() {
    var token = generateToken();
    var userID = null; // set to null to auto generate uid on successfull connection
    rtc.client.join(token, null, userID, function(uid) {
        console.log("User " + uid + " join channel successfully");
        createCameraStream(uid);
        rtc.localStreams.camera.id = uid; // keep track of the stream uid 
    }, function(err) {
        console.log("[ERROR] : join channel failed", err);
    });
  }
  
  // video streams for channel
  function createCameraStream(uid) {
    var localStream = AgoraRTC.createStream({
      streamID: uid,
      audio: true,
      video: true,
      screen: false
    });
    localStream.setVideoProfile(cameraVideoProfile);
    localStream.init(function() {
      console.log("getUserMedia successfully");
      // TODO: add check for other streams. play local stream full size if alone in channel
      localStream.play('local-video'); // play the given stream within the local-video div
  
      // publish local stream
      rtc.client.publish(localStream, function (err) {
        console.log("[ERROR] : publish local stream error: " + err);
      });
    
      enableUiControls(localStream); // move after testing
      rtc.localStreams.camera.stream = localStream; // keep track of the camera stream for later
    }, function (err) {
      console.log("[ERROR] : getUserMedia failed", err);
    });
  }

  function generateToken() {
    return null; // TODO: add a token generation
  }

function enableUiControls(localStream) {

    $("#mic-btn").prop("disabled", false);
    $("#video-btn").prop("disabled", false);
  
    $("#mic-btn").click(function(){
      toggleMic(localStream);
    });
  
    $("#video-btn").click(function(){
      toggleVideo(localStream);
    });
}
  
  function toggleBtn(btn){
    btn.toggleClass('btn-dark').toggleClass('btn-danger');
  }
  
  function toggleScreenShareBtn() {
    $('#screen-share-btn').toggleClass('btn-danger');
    $('#screen-share-icon').toggleClass('fa-share-square').toggleClass('fa-times-circle');
  }
  
  function toggleVisibility(elementID, visible) {
    if (visible) {
      $(elementID).attr("style", "display:block");
    } else {
      $(elementID).attr("style", "display:none");
    }
  }
  
function toggleMic(localStream) {
    toggleBtn($("#mic-btn")); // toggle button colors
    $("#mic-icon").toggleClass('fa-microphone').toggleClass('fa-microphone-slash'); // toggle the mic icon
    if ($("#mic-icon").hasClass('fa-microphone')) {
      localStream.enableAudio(); // enable the local mic
      toggleVisibility("#mute-overlay", false); // hide the muted mic icon
    } else {
      localStream.disableAudio(); // mute the local mic
      toggleVisibility("#mute-overlay", true); // show the muted mic icon
    }
  }
  
function toggleVideo(localStream) {
    toggleBtn($("#video-btn")); // toggle button colors
    $("#video-icon").toggleClass('fa-video').toggleClass('fa-video-slash'); // toggle the video icon
    if ($("#video-icon").hasClass('fa-video')) {
      localStream.enableVideo(); // enable the local video
      toggleVisibility("#no-local-video", false); // hide the user icon when video is enabled
    } else {
      localStream.disableVideo(); // disable the local video
      toggleVisibility("#no-local-video", true); // show the user icon when video is disabled
    }
}

$("#mic-btn").prop("disabled", true);
$("#video-btn").prop("disabled", true);

function LiveVideoStreaming(props) {
    return (
        <>
        <div className="container">
            <button className="btn my-2" onClick={() => joinChannel('host')}>Join Channel as Host</button>
            <button className="btn" onClick={() => joinChannel('audience')}>Join Channel as Audience</button>
            <button className="btn" onClick={() => leaveEventHost('host')}>Leave Event Host</button>
            <button className="btn" onClick={() => leaveEventAudience('audience')}>Leave Event Audience</button>
            
            
        </div>

        <div class="container">
        <div class="row">
            <div class="col-sm">
            <button id="mic-btn" type="button" class="btn btn-block btn-dark btn-lg">
			    <i id="mic-icon" class="fas fa-microphone"></i>
		    </button>
            </div>
            <div class="col-sm">
            <button id="video-btn"  type="button" class="btn btn-block btn-dark btn-lg">
			    <i id="video-icon" class="fas fa-video"></i>
		    </button>
            </div>
        </div>
        </div>

        <div class="container">
        <div class="row">
            <div class="col-sm">
            <div id="local_stream" className="local_stream" style={{ width: "100%", height: "100vh", display: "flex"}}></div>
            </div>
            <div class="col-sm">
            <div
                id="remote_video_"
                style={{ margin:'0px' ,width: "100%", height: "100vh", display: "flex"}}
            >
            </div>
            </div>
        </div>
        </div>
        </>
    );
}   

export default LiveVideoStreaming;
