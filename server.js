const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const { Server } = require("socket.io");

dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
    console.log(err);
    process.exit(1);
});

const http = require("http");

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
    if (user_id) {
        await User.findByIdAndUpdate(user_id, { socket_id });
    }

    //socket event listener

    socket.on("friend_request", async (data) => {
        console.log(data.to);
        const to = await User.findById(date, to);

        //create a friend request

        io.to(to.socket_id).emit("new_friend_request", {});
    });
});

process.on("uncaughtRejection", (err) => {
    console.log(err);
    server.close(() => {
        process.exit(1);
    });
});
