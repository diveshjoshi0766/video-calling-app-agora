import React from 'react';
import AgoraRTC from "agora-rtc-sdk";
import $ from 'jquery';

var rtc = {
    client: null,
    joined: false,
    published: false,
    localStream: null,
    remoteStreams: [],
    params: {}
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

function joinChannel(role) {
    // Create a client
    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "h264" });
    // Initialize the client
    rtc.client.init(option.appID, function () {
        console.log("init success");

        // Join a channel
        rtc.client.join(option.token ?
            option.token : null,
            option.channel, option.uid ? +option.uid : null, function (uid) {
                console.log("join channel: " + option.channel + " success, uid: " + uid);
                rtc.params.uid = uid;
                if (role === "host") {
                    rtc.client.setClientRole("host");
                    // Create a local stream
                    rtc.localStream = AgoraRTC.createStream({
                        streamID: rtc.params.uid,
                        audio: true,
                        video: true,
                        screen: false,
                    })

                    // Initialize the local stream
                    rtc.localStream.init(function () {
                        console.log("init local stream success");
                        rtc.localStream.play("local_stream");
                        rtc.client.publish(rtc.localStream, function (err) {
                            console.log("publish failed");
                            console.error(err);
                        });
                        enableUiControls(rtc.localStream)
                    }, function (err) {
                        console.error("init local stream failed ", err);
                    });

                    rtc.client.on("connection-state-change", function (evt) {
                        console.log("audience", evt)
                    })


                }
                if (role === "audience") {
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
                        remoteStream.play("remote_video_");
                        console.log('stream-subscribed remote-uid: ', id);
                    })
                    rtc.client.on("mute-audio", function (evt) {
                      toggleVisibility('#' + evt.uid + '_mute', true);
                    });
                    
                  rtc.client.on("unmute-audio", function (evt) {
                      toggleVisibility('#' + evt.uid + '_mute', false);
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
        console.error(err);
    })
    rtc.client.leave(function (ev) {
        console.log(ev)
    })
}

function leaveEventAudience(params) {
    rtc.client.leave(function () {
        console.log("client leaves channel");
        //……
    }, function (err) {
        console.log("client leave failed ", err);
        //error handling
    })
}

function toggleVisibility(elementID, visible) {
  if (visible) {
    $(elementID).attr("style", "display:block");
  } else {
    $(elementID).attr("style", "display:none");
  }
}

function toggleBtn(btn){
  btn.toggleClass('btn-dark').toggleClass('btn-danger');
}


function enableUiControls(localStream) {

  $("#mic-btn").prop("disabled", false);
  $("#video-btn").prop("disabled", false);

  $("#mic-btn").click(function(){
    toggleMic(localStream);
  });

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
