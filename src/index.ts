import z from 'zod'
import {WebSocketServer , WebSocket} from 'ws'
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const wss = new WebSocketServer({ port });
// This is a JSON string — literally just a sequence of characters following the JSON format.
// Whether it’s HTTP or WebSocket, what travels over the network is always text (or binary, but JSON is text).

let userCount: number= 0;
// the type of this parameter socket is WebSocket we are importing this from ws bcoz we have to use 
// WebSocket from this library bcoz we are using event listener from this library it
// is also natively present in JS
const rooms = new Map()

const joinSchema = z.object({
    type : z.literal('join') ,
    roomId: z.string() ,
})

const chatSchema = z.object({
    type: z.literal('chat'),
    user: z.string(),
    text: z.string(),
})
wss.on('connection' , (socket)=>{
    let currentRoom : string | null= null;
    
    console.log("Someone Connected")
    // after connection is established first time currentRoom will be null
    // after first  request to join room currentRoom will be setup and changed from null
    // map with key as currentRoom will have all the sockets corresponding to that roomId
    socket.on('message' , (message)=>{
        // converting binary or buffer data to normal JSON string this is extra step that HTTP
        const msgString = message.toString();
        let data: unknown;
        // JSON string to JS object
        try{
            data = JSON.parse(msgString);
        }
        catch(err){
            console.log("Error parsing JSON" , err);
            socket.send("Invalid JSON format");
            return ;
        }

        if(typeof data === 'object' && data !== null && 'type' in data)
        {
                if(data.type === "join"){
                const result = joinSchema.safeParse(data);
                if(!result.success) {
                    socket.send("Invalid join payload");
                    return ;
                }
                currentRoom = result.data.roomId;
                if(!rooms.has(currentRoom)){
                    rooms.set(currentRoom , new Set());
                }

                rooms.get(currentRoom).add(socket);
                console.log(`Currently number members in rooms ${currentRoom} : ${rooms.get(currentRoom)!.size}`);
                socket.send(`You have joined room ${currentRoom}`);
                // room has been added to that room id
                }
                else if(data.type === "chat" && currentRoom!==null){
                    const result = chatSchema.safeParse(data);
                    if(! result.success) {
                        socket.send("Invalid chat payload");
                        return ;
                    }
                    const array: WebSocket[] = Array.from(rooms.get(currentRoom));

                    for(const s of array){
                        if(s != socket) s.send(JSON.stringify({user: result.data.user , text: result.data.text}))
                    }
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