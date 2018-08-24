/* jshint asi: true, node: true, laxbreak: true, laxcomma: true, undef: true, unused: true, esversion: 6 */
// Initiating a call example. Note: we use bogus sdp, so no real rtp session will be established.

process.env.DEBUG = 'sip'
const sip = require('../sip')

const dialogs = {};


sip.start({
  tls : { rejectUnauthorized: false }
, udp : false
}, (request) => {
  if (!request.headers.to.params.tag) return sip.send(sip.makeResponse(request, 405, 'Method not allowed'))

  const id = [request.headers['call-id'], request.headers.to.params.tag, request.headers.from.params.tag].join(':')
    
  if (!dialogs[id]) sip.send(sip.makeResponse(request, 481, "Call doesn't exists"))

  dialogs[id](request)
})


const ding =
{
  "id": 6593027566787474000,
  "id_str": "6593027566787474711",
  "state": "ringing",
  "protocol": "sip",
  "doorbot_id": 12170519,
  "doorbot_description": "Front Door",
  "device_kind": "jbox_v1",
  "motion": false,
  "snapshot_url": "",
  "kind": "on_demand",
  "sip_server_ip": "35.174.123.141",
  "sip_server_port": 15063,
  "sip_server_tls": true,
  "sip_session_id": "5mvp3kg0bjd8n-209709t1th4obq",
  "sip_from": "sip:18253915@ring.com",
  "sip_to": "sip:5mvp3kg0bjd8n-209709t1th4obq@35.174.123.141:15064;transport=tls",
  "audio_jitter_buffer_ms": 300,
  "video_jitter_buffer_ms": 300,
  "sip_endpoints": null,
  "expires_in": 179,
  "now": 1535058852.56162,
  "optimization_level": 1,
  "sip_token": "cb8f99365cc4961c9184cd2dcb26e394c2c9301a7e42c96517668a20aa74983e",
  "sip_ding_id": "6593027566787474711"
}

const invite =
{ uri              : ding.sip_to
, method           : "INVITE"
, headers          :
  { "content-type" : "application/sdp"
  , "call-id"      : Math.floor(Math.random() * 1e6).toString()
  , cseq           :
    { method       : "INVITE"
    , seq          : Math.floor(Math.random() * 1e5)
    }
  , from           :
    { uri          : ding.sip_from
    ,  params      :
       { tag       : Math.floor(Math.random() * 1e6).toString() }
    }
  , to             :
    { uri          : ding.sip_to }
  , contact        :
    [ { uri        : ding.sip_from } ]
  , via            : []
  }
, content          : ""
}

sip.send(invite, (response) => {
  if(response.status >= 300) return console.log('call failed with status ' + response.status)  

  if(response.status < 200) return console.log('call progress status ' + response.status)

  console.log('call answered with tag ' + response.headers.to.params.tag)    
  sip.send(
  { method      : 'ACK'
  , uri         : response.headers.contact[0].uri
  , headers     :
    { 'call-id' : response.headers['call-id']
    , cseq      :
      { method  : 'ACK'
      , seq     : response.headers.cseq.seq
      }
    , from      : response.headers.from
    , to        : response.headers.to
    , via       : []
    }
  })

  const id = [response.headers['call-id'], response.headers.from.params.tag, response.headers.to.params.tag].join(':')

  if (dialogs[id]) return

  dialogs[id] = (request) => {
    console.log('received ' + request.method)
    if (request.method !== 'BYE') return sip.send(sip.makeResponse(request, 405, 'Method not allowed'))

    delete dialogs[id]
    sip.send(sip.makeResponse(request, 200, 'OK'))
  }
})

