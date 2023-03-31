const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const { Server } = require("socket.io");
const FriendRequest = require("./models/friendRequest");
const Message = require("./models/Message");

dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
    console.log(err);
    process.exit(1);
});

const http = require("http");
const User = require("./models/user");
// const { default: Message } = require("../ChatRealTime/src/components/Conversation/Message");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        // useCreateIndex: true,
        // useFindAndModify: false,
        // useUnfiedToplogy: true,
    })
    .then((con) => {
        console.log("DB connection is successful");
    })
    .catch((err) => {
        console.log(err);
    });

// 3000, 5000

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log(`App running on port ${port}`);
});

io.on("connection", async (socket) => {
    const user_id = socket.handshake.query["user_id"];
    const socket_id = socket.id;
    console.log(`User connected ${socket_id}`);
    if (Boolean(user_id)) {
        await User.findByIdAndUpdate(user_id, { socket_id, status: "Online" });
    }

    //socket event listener

    socket.on("friend_request", async (data) => {
        const to = await User.findById(data.to).select("socket_id");
        const from = await User.findById(data.from).select("socket_id");

        // create a friend request
        await FriendRequest.create({
            sender: data.from,
            recipient: data.to,
        });
        // emit event request received to recipient
        io.to(to.socket_id).emit("new_friend_request", {
            message: "New friend request received",
        });
        io.to(from.socket_id).emit("request_sent", {
            message: "Request Sent successfully!",
        });
    });

    socket.on("accept_request", async (data) => {
        // accept friend request => add ref of each other in friends array
        console.log(data);
        const request_doc = await FriendRequest.findById(data.request_id);

        console.log(request_doc);

        const sender = await User.findById(request_doc.sender);
        const receiver = await User.findById(request_doc.recipient);

        sender.friends.push(request_doc.recipient);
        receiver.friends.push(request_doc.sender);

        await receiver.save({ new: true, validateModifiedOnly: true });
        await sender.save({ new: true, validateModifiedOnly: true });

        await FriendRequest.findByIdAndDelete(data.request_id);

        // delete this request doc
        // emit event to both of them

        // emit event request accepted to both
        io.to(sender.socket_id).emit("request_accepted", {
            message: "Friend Request Accepted",
        });
        io.to(receiver.socket_id).emit("request_accepted", {
            message: "Friend Request Accepted",
        });
    });

    socket.on("get_direct_conversations", async ({ user_id }, callback) => {
        const existing_conversations = await Message.find({
            participants: { $all: [user_id] },
        }).populate("participants", "firstName lastName _id email status");

        console.log(existing_conversations);

        callback(existing_conversations);
    });

    socket.on("start_conversation", async (data) => {
        // data: {to: from:}

        const { to, from } = data;

        // check if there is any existing conversation

        const existing_conversations = await Message.find({
            participants: { $size: 2, $all: [to, from] },
        }).populate("participants", "firstName lastName _id email status");

        console.log(existing_conversations[0], "Existing Conversation");

        // if no => create a new Message doc & emit event "start_chat" & send conversation details as payload
        if (existing_conversations.length === 0) {
            let new_chat = await Message.create({
                participants: [to, from],
            });

            new_chat = await Message.findById(new_chat).populate("participants", "firstName lastName _id email status");

            console.log(new_chat);

            socket.emit("start_chat", new_chat);
        }
        // if yes => just emit event "start_chat" & send conversation details as payload
        else {
            socket.emit("start_chat", existing_conversations[0]);
        }
    });

    socket.on("get_messages", async (data, callback) => {
        const { messages } = await Message.findById(data.conversation_id).select("messages");
        callback(messages);
    });

    // handle text/link message
    socket.on("text_message", async (data) => {
        console.log("Received message", data);

        // data to, from, text, conversation_id, type
        const { to, from, message, conversation_id, type } = data;
        const new_message = { to, from, type, text: message, created_at: Date.now() };
        const to_user = await User.findById(to);
        const from_user = await User.findById(from);

        // create new conversation if it doesnt exist yet or add new message to the message list
        const chat = await Message.findById(conversation_id);
        chat.messages.push(new_message);

        // save to db
        await chat.save({});

        // emit incoming_message -> to used
        io.to(to_user.socket_id).emit("new_message", { conversation_id, message: new_message });

        // emit outgoing_message -> from user
        io.to(from_user.socket_id).emit("new_message", { conversation_id, message: new_message });
    });

    socket.on("file_message", (data) => {
        console.log("Received message", data);

        // data: text, from, file

        // get the file extension
        const fileExtension = path.extname(data.file.name);

        // generate a unique filname
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}${fileExtension}`;

        // upload file to aws

        // create new conversation if it doesnt exist yet or add new message to the message list

        // save to db

        // emit incoming_message -> to used

        // emit outgoing_message -> from user
    });

    socket.on("end", async (data) => {
        // find user by id and set status to offline
        if (data.user_id) {
            await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
        }
        // boardcast user disconnected
        console.log("closing connection");
        socket.disconnect(0);
    });
});

process.on("uncaughtRejection", (err) => {
    console.log(err);
    server.close(() => {
        process.exit(1);
    });
});
