const http = require('http');
const { WebSocketServer } = require('ws');
const server = http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});res.end('Saqoor central multiplayer server is running');});
const wss = new WebSocketServer({server});
const rooms = new Map();
function send(ws,obj){if(ws && ws.readyState===1)ws.send(JSON.stringify(obj));}
function newCode(){for(let i=0;i<100;i++){const c=String(Math.floor(100000+Math.random()*900000));if(!rooms.has(c))return c;}throw new Error('No room codes available');}
wss.on('connection',ws=>{
  ws.room=null;ws.role=null;
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return;}
    if(m.type==='create'){
      if(ws.room)return;const code=newCode();rooms.set(code,{host:ws,guest:null});ws.room=code;ws.role='host';send(ws,{type:'created',code});return;
    }
    if(m.type==='join'){
      const code=String(m.code||'');const room=rooms.get(code);
      if(!/^\d{6}$/.test(code)||!room){send(ws,{type:'error',message:'الغرفة غير موجودة. اطلب رمزاً جديداً من صديقك.'});return;}
      if(room.guest){send(ws,{type:'error',message:'الغرفة ممتلئة؛ الحد لاعبان.'});return;}
      room.guest=ws;ws.room=code;ws.role='guest';send(ws,{type:'joined',code});send(room.host,{type:'peer-joined'});return;
    }
    const room=rooms.get(ws.room);if(!room)return;
    if(m.type==='input'&&ws.role==='guest')send(room.host,{type:'input',input:m.input||{}});
    else if(m.type==='state'&&ws.role==='host')send(room.guest,{type:'state',state:m.state||{}});
    else if(m.type==='start'&&ws.role==='host')send(room.guest,{type:'start',seed:m.seed});
  });
  ws.on('close',()=>{const room=rooms.get(ws.room);if(!room)return;if(ws.role==='host'){send(room.guest,{type:'peer-left'});rooms.delete(ws.room);}else if(ws.role==='guest'){room.guest=null;send(room.host,{type:'peer-left'});}});
});
const port=process.env.PORT||3000;server.listen(port,'0.0.0.0',()=>console.log(`Saqoor server listening on ${port}`));
