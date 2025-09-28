import { WebSocketServer  , WebSocket}  from 'ws';

const wss = new WebSocketServer({port : 8080})
// This is a JSON string — literally just a sequence of characters following the JSON format.
// Whether it’s HTTP or WebSocket, what travels over the network is always text (or binary, but JSON is text).

let userCount: number= 0;
let allSockets : WebSocket[] = []
// the type of this parameter socket is WebSocket we are importing this from ws bcoz we have to use 
// WebSocket from this library bcoz we are using event listener from this library it
// is also natively present in JS
const rooms = new Map()
wss.on('connection' , (socket)=>{
    let currentRoom : String | null= null;
    
    // after connection is established first time currentRoom will be null
    // after first  request to join room currentRoom will be setup and changed from null
    // map with key as currentRoom will have all the sockets corresponding to that roomId
    socket.on('message' , (message)=>{
        // converting binary or buffer data to normal JSON string this is extra step that HTTP
        const msgString = message.toString();
        // JSON string to JS object
        const data = JSON.parse(msgString);
        if(data.type === "join"){
            currentRoom = data.roomId;
            if(!rooms.has(currentRoom)){
                rooms.set(currentRoom , new Set());
            }

            rooms.get(currentRoom).add(socket);
            console.log(`Currently number members in rooms ${currentRoom} : ${rooms.get(currentRoom)!.size}`);
            socket.send(`You have joined room ${currentRoom}`);
            // room has been added to that room id
        }
        else if(data.type === "chat"){
            const array: WebSocket[] = rooms.get(currentRoom);

            for(const s of array){
                if(s != socket) s.send(JSON.stringify({user: data.user , text: data.text}))
            }
        }
    })
    socket.on('close' , ()=>{
        if(currentRoom && rooms.get(currentRoom)){
            rooms.get(currentRoom).delete(socket) ;
            if(rooms.get(currentRoom).size == 0){
                rooms.delete(currentRoom);
            }
            console.log(`Currently number of rooms ${rooms.size}`);
        } 
    })
    
})

// If user is connected to some roomId then he directly switches the room by changing the 
// roomId and sending join then its socket is same bcoz connection is persistent 
// so two roomId arrays will have same socket and that client will take part 
// in two rooms by sending and reciving messages 