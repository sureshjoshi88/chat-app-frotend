import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../context/authProvider";
import { Check } from 'lucide-react';
import { CheckCheck } from 'lucide-react';



const socket = io("http://localhost:4000");

const Test = () => {

    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [typingUser, setTypingUser] = useState("");

    const [selectedUser, setSelectedUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);



    const user = JSON.parse(localStorage.getItem("user"));

    const typingTimeout = useRef(null);



    const handleTyping = (e) => {
        setMessage(e.target.value);

        socket.emit("typing", {
            username: user.name,
            receiverId: selectedUser?._id
        });
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        typingTimeout.current = setTimeout(() => {
            socket.emit("stop_typing", selectedUser?._id);
        }, 1000);
    };



    useEffect(() => {
        socket.on("user_typing", (username) => {
            setTypingUser(username);
        });

        socket.on("user_stop_typing", () => {
            setTypingUser("");
        });

        return () => {
            socket.off("user_typing");
            socket.off("user_stop_typing");
        };
    }, []);




    useEffect(() => {

        socket.on("online_users", (users) => {

            setOnlineUsers(users);

        });

        return () => {
            socket.off("online_users");
        };

    }, []);





    useEffect(() => {
        socket.on("receive_message", (data) => {
            console.log("NEW MESSAGE", data);

            // setChat((prev) => [...prev, data]);
            setChat((prev) => [...prev, {
                ...data,
                seen: data.seen || false
            }]);
        });

        socket.on("load_messages", (data) => {
            setChat(data);
        });

        return () => {
            socket.off("receive_message");
            socket.off("load_messages");
        };
    }, []);



    const sendMessage = () => {

        if (!selectedUser) {
            alert("Please select a user");
            return;
        }
        if (!message.trim()) return;

        socket.emit("send_message", {
            text: message,
            senderId: user._id,
            receiverId: selectedUser._id,
            user: user.name
        });
        setMessage("");
    };



    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get("http://localhost:4000/api/user");
                setUsers(res?.data?.user);
            } catch (err) {
                console.log(err);
            }
        };

        fetchUsers();
    }, []);

    const { logout, isAuthenticated } = useAuth();

    useEffect(() => {

        if (user?._id) {
            socket.emit("register", user._id);
        }

    }, []);

    useEffect(() => {

        socket.on("message_seen_update", (messageId) => {

            setChat((prev) =>
                prev.map((msg) =>
                    msg._id === messageId
                        ? { ...msg, seen: true }
                        : msg
                )
            );

        });

        return () => {
            socket.off("message_seen_update");
        };

    }, []);



    const filteredChats = chat.filter((msg) => {

        const senderId = msg.senderId?.toString();
        const receiverId = msg.receiverId?.toString();

        return (
            (senderId === user?._id &&
                receiverId === selectedUser?._id) ||

            (senderId === selectedUser?._id &&
                receiverId === user?._id)
        );
    });



    useEffect(() => {

        filteredChats.forEach((msg) => {

            if (
                msg.receiverId?.toString() === user?._id &&
                !msg.seen
            ) {

                socket.emit("message_seen", {
                    messageId: msg._id,
                    senderId: msg.senderId
                });

            }

        });

    }, [filteredChats]);




    useEffect(() => {
        if (selectedUser) {
            socket.emit("load_private_messages", {
                senderId: user?._id,
                receiverId: selectedUser?._id
            });
        }

    }, [selectedUser]);
        const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile responsive sidebar ke liye


    return (
        // <div className="flex h-screen bg-gray-100">

        //     {/* Sidebar */}
        //     <div className="w-64 bg-gradient-to-b from-indigo-900 to-indigo-700 text-white p-5">
        //         <h2 className="text-xl font-bold mb-5">Chatly</h2>

        //         <input
        //             className="w-full p-2 rounded bg-indigo-800 placeholder-gray-300 outline-none mb-5"
        //             placeholder="Search..."
        //         />

        //         <div className="mb-5 border-b border-gray-500 pb-3">
        //             <p className="font-bold">{user?.name}</p>
        //             <p className="text-sm text-gray-300">You</p>
        //         </div>
        //         <div className="space-y-2">
        //             {users?.filter((u) => u._id !== user?._id)?.map((u) => (
        //                 <div key={u._id}>
                          
        //                     <div className={`p-2 rounded cursor-pointer flex justify-between items-center ${selectedUser?._id === u._id
        //                         ? "bg-indigo-500"
        //                         : "hover:bg-indigo-500"
        //                         }`}
        //                         onClick={() => setSelectedUser(u)}
        //                     >
        //                         <span>{u.name}</span>

        //                         {onlineUsers.includes(u._id.toString()) ? (
        //                             <span className="text-green-400 text-xs">
        //                                 Online
        //                             </span>
        //                         ) : (
        //                             <span className="text-gray-300 text-xs">
        //                                 Offline
        //                             </span>
        //                         )}
        //                     </div>
        //                 </div>


        //             ))}
        //         </div>
        //     </div>

        //     {/* Chat Area */}
        //     <div className="flex flex-col flex-1">

        //         {/* Header */}
        //         <div className="bg-white p-4 shadow flex justify-between">
        //             <h3 className="font-semibold text-lg">
        //                 {selectedUser ? selectedUser.name : "Select User"}
        //             </h3>
        //             {isAuthenticated && <div>
        //                 <button onClick={logout} className="bg-blue-700 text-white py-1 px-3 rounded cursor-pointer font-medium">Logout</button>
        //             </div>}

        //         </div>




        //         <div className="flex-1 p-4 overflow-y-auto space-y-3">
        //             {filteredChats.length === 0 ? <p className="flex justify-center font-medium text-xl">No Chat Found</p> : filteredChats.map((msg, index) => (
        //                 <div
        //                     key={index}
        //                     className={`max-w-xs px-4 py-2 rounded-lg ${msg?.user === user?.name
        //                         ? "ml-auto bg-indigo-500 text-white"
        //                         : "bg-gray-300 text-black"
        //                         }`}
        //                 >
        //                     <p>{msg.text}</p>
        //                     <div className="flex justify-end items-center gap-1.5 mt-1">
        //                     <p className="text-xs  opacity-70">
        //                         {new Date(msg.createdAt).toLocaleString()}
        //                     </p>
        //                         {msg.senderId?.toString() === user?._id && (
        //                             <span className="text-xs">
        //                                 {msg.seen ? <CheckCheck  size={15} />
        //                                     : <Check size={15} />
        //                                 }
        //                             </span>
        //                         )}
        //                     </div>

        //                 </div>
        //             ))}
        //         </div>

        //         {typingUser && (
        //             <p className="text-sm text-gray-500 italic px-4">
        //                 {typingUser} is typing...
        //             </p>
        //         )}
        //         {/* Input */}
        //         <form action="" onSubmit={(e) => {
        //             e.preventDefault();
        //             sendMessage();
        //         }}>
        //             <div className="flex p-4 bg-white border-t">
        //                 <input
        //                     value={message}
        //                     // onChange={(e) => setMessage(e.target.value)}
        //                     onChange={handleTyping}
        //                     placeholder="Type a message..."
        //                     className="flex-1 p-2 border rounded-lg outline-none"
        //                 />
        //                 <button
        //                     // onClick={sendMessage}
        //                     type="submit"
        //                     className="ml-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        //                 >
        //                     Send
        //                 </button>
        //             </div>
        //         </form>

        //     </div>
        // </div>


// Agar Menu/X icons use karne hain responsive sidebar ke liye (Lucide React icons recommended)
// import { Menu, X, Send, LogOut, Check, CheckCheck, Search } from 'lucide-react';


  
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
            
            {/* Overlay for Mobile Sidebar */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 text-white p-5 flex flex-col justify-between
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div>
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">C</div>
                            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Chatly</h2>
                        </div>
                        {/* Mobile Close Button */}
                        <button className="md:hidden p-1 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                            ✕
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-sm">🔍</span>
                        <input
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 placeholder-slate-400 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            placeholder="Search conversations..."
                        />
                    </div>

                    {/* Current User Profile Summary */}
                    <div className="mb-6 bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold uppercase shadow-inner">
                            {user?.name ? user.name[0] : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold text-sm truncate">{user?.name || "Guest User"}</p>
                            <p className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span> Active Now
                            </p>
                        </div>
                    </div>

                    {/* Users List Heading */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">Recent Chats</p>

                    {/* Users List Container */}
                    <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar">
                        {users?.filter((u) => u._id !== user?._id)?.map((u) => {
                            const isSelected = selectedUser?._id === u._id;
                            const isOnline = onlineUsers.includes(u._id.toString());
                            
                            return (
                                <div
                                    key={u._id}
                                    className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all duration-200 group ${
                                        isSelected
                                            ? "bg-indigo-600 shadow-md shadow-indigo-600/10 text-white"
                                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                                    }`}
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setIsSidebarOpen(false); // Close sidebar on mobile after selection
                                    }}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        {/* User Fake Avatar */}
                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-medium text-sm border ${
                                            isSelected ? 'bg-indigo-500/50 border-indigo-400/30' : 'bg-slate-800 border-slate-700 group-hover:border-slate-600'
                                        }`}>
                                            {u.name ? u.name[0].toUpperCase() : '?'}
                                        </div>
                                        <span className="font-medium text-sm truncate">{u.name}</span>
                                    </div>

                                    {/* Online/Offline Status Indicator DOT */}
                                    <span className="relative flex h-2.5 w-2.5 ml-2 flex-shrink-0">
                                        {isOnline && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        )}
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col flex-1 h-full bg-slate-50">

                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-200/80 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        {/* Hamburger Menu for Mobile */}
                        <button 
                            className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg mr-1 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            ☰
                        </button>
                        
                        <div>
                            <h3 className="font-bold text-slate-800 text-base md:text-lg tracking-tight">
                                {selectedUser ? selectedUser.name : "Select a conversation"}
                            </h3>
                            {selectedUser && (
                                <p className="text-xs text-slate-400 font-medium">
                                    {onlineUsers.includes(selectedUser._id.toString()) ? 'Active now' : 'Offline'}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {isAuthenticated && (
                        <div>
                            <button 
                                onClick={logout} 
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 py-2 px-4 rounded-xl cursor-pointer font-medium text-sm transition-all duration-200 border border-slate-200 hover:border-red-200"
                            >
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat Messages Space */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 pattern-grid">
                    {filteredChats.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <div className="text-4xl">💬</div>
                            <p className="font-medium text-base">No messages yet</p>
                            <p className="text-xs text-slate-400">Start the conversation by sending a text below.</p>
                        </div>
                    ) : (
                        filteredChats.map((msg, index) => {
                            const isMe = msg?.user === user?.name;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col max-w-[75%] md:max-w-md ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                                >
                                    <div
                                        className={`px-4 py-2.5 shadow-sm transition-all ${
                                            isMe
                                                ? "bg-indigo-600 text-white rounded-2xl rounded-tr-none font-normal"
                                                : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-none font-normal"
                                        }`}
                                    >
                                        <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                                    </div>
                                    
                                    {/* Meta info (Time + Double tick) */}
                                    <div className="flex items-center gap-1 mt-1 px-1">
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                        {isMe && msg.senderId?.toString() === user?._id && (
                                            <span className={`text-[10px] ${msg.seen ? "text-indigo-500" : "text-slate-400"}`}>
                                                {msg.seen ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Typing Indicator */}
                {typingUser && (
                    <div className="px-6 py-1 bg-gradient-to-t from-slate-50 to-transparent">
                        <p className="text-xs text-indigo-500 font-medium animate-pulse flex items-center gap-1.5">
                            <span className="flex space-x-1">
                                <span className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce"></span>
                                <span className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="h-1 w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </span>
                            {typingUser} is typing...
                        </p>
                    </div>
                )}

                {/* Input Form */}
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                    className="p-4 bg-white border-t border-slate-200/80 backdrop-blur-md"
                >
                    <div className="flex items-center gap-2 max-w-7xl mx-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all duration-200">
                        <input
                            value={message}
                            onChange={handleTyping}
                            placeholder="Type a message friendly..."
                            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={!message.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl font-medium text-sm transition-all duration-150 flex items-center justify-center shadow-md shadow-indigo-600/10 active:scale-95"
                        >
                            <span className="px-2 font-semibold">Send</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>

    )
}

export default Test