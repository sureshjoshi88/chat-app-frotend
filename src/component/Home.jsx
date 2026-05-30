import React, { useEffect, useRef, useState, useMemo } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useAuth } from "../context/authProvider";
import { Check, CheckCheck, Menu, X, Search, LogOut } from 'lucide-react';
const BASE_URL = import.meta.env.VITE_BASE_URL;
const BASE_URL_SOCKET = import.meta.env.VITE_BASE_URL_SOCKET;

const socket = io(`${BASE_URL_SOCKET}`);

const Home = () => {
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [typingUser, setTypingUser] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { logout, isAuthenticated } = useAuth();
    const typingTimeout = useRef(null);
    const messagesEndRef = useRef(null);

    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});


    const notificationSound = useRef(null);

    useEffect(() => {
        notificationSound.current = new Audio("/notifaction.wav");

        notificationSound.current.load();
    }, []);

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            return null;
        }
    }, []);

    // 1. Fetch Users List (Once on mount)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get(`${BASE_URL}user`);
                setUsers(res?.data?.user || []);
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        };
        fetchUsers();
    }, []);

    // 2. Register socket user identity
    useEffect(() => {
        if (user?._id) {
            socket.emit("register", user._id);
        }
    }, [user?._id]);

    // 3. Centralized Socket Listeners (Core Engine)
    useEffect(() => {
        socket.on("online_users", (usersList) => {
            setOnlineUsers(usersList);
        });

        socket.on("load_messages", (data) => {
            setChat(data || []);
        });

        socket.on("receive_message", (data) => {
            setChat((prev) => [...prev, { ...data, seen: data.seen || false }]);
            if (data.senderId?.toString() !== user?._id) {

                notificationSound.current.currentTime = 0;

                notificationSound.current.play()
                    .catch((err) => console.log(err));

            }

            const otherUserId =
                data.senderId?.toString() === user?._id?.toString()
                    ? data.receiverId
                    : data.senderId;

            setLastMessages((prev) => ({
                ...prev,
                [otherUserId]: data.text
            }));

            if (
                data.senderId?.toString() !== user?._id?.toString() &&
                selectedUser?._id?.toString() !== data.senderId?.toString()) {

                setUnreadCounts((prev) => ({
                    ...prev,
                    [data.senderId]: (prev[data.senderId] || 0) + 1
                }));

            }
        });

        socket.on("message_seen_update", (messageId) => {
            setChat((prev) =>
                prev.map((msg) => (msg._id === messageId ? { ...msg, seen: true } : msg))
            );
        });

        return () => {
            socket.off("online_users");
            socket.off("load_messages");
            socket.off("receive_message");
            socket.off("message_seen_update");
        };
    }, []);

    useEffect(() => {

        const unlockAudio = () => {

            notificationSound.current.play()
                .then(() => {
                    notificationSound.current.pause();
                    notificationSound.current.currentTime = 0;
                })
                .catch(() => { });

            document.removeEventListener("click", unlockAudio);
        };

        document.addEventListener("click", unlockAudio);

    }, []);
    // 4. Context-Aware Typing Listeners (Saves multi-user glitch)
    useEffect(() => {
        const handleUserTyping = (data) => {
            // Agar backend se structural object aa raha hai toh data.senderId check karo, nahi toh fallback string array par
            const incomingSenderId = typeof data === 'object' ? data.senderId : null;
            const incomingUsername = typeof data === 'object' ? data.username : data;

            if (selectedUser && (!incomingSenderId || incomingSenderId === selectedUser._id)) {
                setTypingUser(incomingUsername);
            }
        };

        const handleUserStopTyping = (senderId) => {
            if (!senderId || (selectedUser && selectedUser._id === senderId)) {
                setTypingUser("");
            }
        };

        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);

        setTypingUser(""); // Purane active indicator ko clear karo jab user badle

        return () => {
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
        };
    }, [selectedUser]);

    // 5. Load private chat on user change
    useEffect(() => {
        if (selectedUser && user?._id) {
            socket.emit("load_private_messages", {
                senderId: user._id,
                receiverId: selectedUser._id,
            });
        }
    }, [selectedUser, user?._id]);

    // 6. Optimized Message Filter (Using useMemo to save CPU ticks)
    const filteredChats = useMemo(() => {
        if (!selectedUser || !user?._id) return [];
        return chat.filter((msg) => {
            const senderId = msg.senderId?.toString();
            const receiverId = msg.receiverId?.toString();
            return (
                (senderId === user._id && receiverId === selectedUser._id) ||
                (senderId === selectedUser._id && receiverId === user._id)
            );
        });
    }, [chat, selectedUser, user?._id]);

    // 7. Dynamic Unread Detection (Fixes Infinite Render Loops)
    const unreadMessagesString = useMemo(() => {
        return JSON.stringify(
            filteredChats
                .filter((msg) => msg.receiverId?.toString() === user?._id && !msg.seen)
                .map((msg) => msg._id)
        );
    }, [filteredChats, user?._id]);

    useEffect(() => {
        if (!user?._id) return;

        filteredChats.forEach((msg) => {
            if (msg.receiverId?.toString() === user._id && !msg.seen) {
                socket.emit("message_seen", {
                    messageId: msg._id,
                    senderId: msg.senderId
                });
            }
        });
    }, [unreadMessagesString, user?._id]); // Run tabhi hoga jab unread IDs badlengi

    // 8. New Message Auto Scroll Effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [filteredChats, typingUser]);

    // 9. Input change handler with typing debouncer
    const handleTyping = (e) => {
        setMessage(e.target.value);
        if (!user || !selectedUser) return;

        socket.emit("typing", {
            username: user.name,
            senderId: user._id,
            receiverId: selectedUser?._id
        });

        if (typingTimeout.current) clearTimeout(typingTimeout.current);

        typingTimeout.current = setTimeout(() => {
            socket.emit("stop_typing", selectedUser?._id);
        }, 1200);
    };

    // 10. Send Action Handler
    const sendMessage = () => {
        if (!selectedUser) {
            alert("Please select a user");
            return;
        }
        if (!message.trim()) return;

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        socket.emit("stop_typing", selectedUser._id);

        socket.emit("send_message", {
            text: message.trim(),
            senderId: user._id,
            receiverId: selectedUser._id,
            user: user.name
        });
        setMessage("");
    };

    // Users filtering logic based on Search input
    // const filteredUsersList = useMemo(() => {
    //     return users
    //         ?.filter((u) => u._id !== user?._id)
    //         ?.filter((u) => u.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    // }, [users, user?._id, searchQuery]);
    const filteredUsersList = useMemo(() => {

        return [...users]
            ?.filter((u) => u._id !== user?._id)
            ?.filter((u) =>
                u.name?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
            )
            ?.sort((a, b) => {

                const aMsg = chat
                    .filter(
                        (m) =>
                            m.senderId === a._id ||
                            m.receiverId === a._id
                    )
                    .slice(-1)[0];

                const bMsg = chat
                    .filter(
                        (m) =>
                            m.senderId === b._id ||
                            m.receiverId === b._id
                    )
                    .slice(-1)[0];

                return new Date(bMsg?.createdAt || 0)
                    - new Date(aMsg?.createdAt || 0);

            });

    }, [users, user?._id, searchQuery, chat]);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">

            {/* Backdrop Overlay for Mobile Screen Navigation */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-20 md:hidden backdrop-blur-sm transition-all duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar View */}
            <div className={`
                fixed inset-y-0 left-0 z-30 w-76 bg-slate-950 text-slate-200 p-5 flex flex-col justify-between
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-slate-900
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-5 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-600/20">
                                C
                            </div>
                            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                Chatly
                            </h2>
                        </div>
                        <button className="md:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Interactive Modern Search Box */}
                    <div className="relative mb-5 flex-shrink-0">
                        <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-500" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-900 border border-slate-800 placeholder-slate-500 text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-150"
                            placeholder="Search active users..."
                        />
                    </div>

                    {/* Current User Identity Panel */}
                    <div className="mb-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-semibold text-sm truncate text-white">{user?.name || "Anonymous"}</p>
                            <p className="text-xs text-indigo-400 font-medium flex items-center gap-1.5 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Active Session
                            </p>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1 flex-shrink-0">Conversations</p>

                    {/* Users Contact Directory List */}
                    <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                        {filteredUsersList.length === 0 ? (
                            <p className="text-xs text-slate-600 text-center py-4 italic">No users found</p>
                        ) : (
                            filteredUsersList.map((u) => {
                                const isSelected = selectedUser?._id === u._id;
                                const isOnline = onlineUsers.includes(u._id.toString());

                                return (
                                    <div
                                        key={u._id}
                                        className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all duration-150 group ${isSelected
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                                            : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                                            }`}
                                        onClick={() => {

                                            setSelectedUser(u);

                                            // unread clear
                                            setUnreadCounts((prev) => ({
                                                ...prev,
                                                [u._id]: 0
                                            }));

                                            setIsSidebarOpen(false);

                                        }}
                                    >
                                        <div className="flex items-center gap-3 flex-1 overflow-hidden">

                                            <div
                                                className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm border transition-colors ${isSelected
                                                    ? 'bg-indigo-500 border-indigo-400/30 text-white'
                                                    : 'bg-slate-900 border-slate-800 group-hover:border-slate-700 text-slate-300'
                                                    }`}
                                            >
                                                {u.name ? u.name[0].toUpperCase() : '?'}
                                            </div>

                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium text-sm truncate">
                                                    {u.name}
                                                </span>

                                                <span className="text-xs text-slate-400 truncate">
                                                    {lastMessages[u._id] || "No messages yet"}
                                                </span>
                                            </div>

                                        </div>
                                        {unreadCounts[u._id] > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">
                                                {unreadCounts[u._id]}
                                            </span>
                                        )}

                                        {/* Dynamic Pulsing Status Light */}
                                        <span className="relative flex h-2 w-2 ml-2 flex-shrink-0">
                                            {isOnline && (
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            )}
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-slate-700'}`} />
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Application Main Chat Window Dashboard */}
            <div className="flex flex-col flex-1 h-full bg-slate-50 relative">

                {/* Navbar Action Control Header */}
                <div className="bg-white/80 backdrop-blur-md px-6 py-3.5 border-b border-slate-200/80 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button
                            className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl mr-0.5 transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={20} />
                        </button>

                        <div className="truncate">
                            <h3 className="font-bold text-slate-800 text-base md:text-lg tracking-tight truncate">
                                {selectedUser ? selectedUser.name : "Open a workspace"}
                            </h3>
                            {selectedUser && (
                                <p className="text-xs font-semibold mt-0.5 flex items-center gap-1">
                                    {onlineUsers.includes(selectedUser._id.toString()) ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> online
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">offline</span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    {isAuthenticated && (
                        <div className="flex-shrink-0">
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 py-1.5 px-3.5 rounded-xl cursor-pointer font-semibold text-xs transition-all duration-150 border border-slate-200 hover:border-red-200 shadow-sm active:scale-95"
                            >
                                <LogOut size={14} />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                        </div>
                    )}

                </div>

                {/* Scrollable Feed Space Area */}
                <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-50/60 custom-scrollbar">
                    {!selectedUser ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2.5">
                            <div className="h-16 w-16 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center text-3xl">💬</div>
                            <p className="font-bold text-slate-700 text-base">Welcome to Chatly Dashboard</p>
                            <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">Select any active profile from the navigation directory panel to stream instant private dialogues.</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                            <p className="font-semibold text-slate-500 text-sm">No communications yet</p>
                            <p className="text-xs text-slate-400">Send an introduction statement block down below.</p>
                        </div>
                    ) : (
                        filteredChats.map((msg, index) => {
                            const isMe = msg?.user === user?.name;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col max-w-[80%] md:max-w-md ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                                >
                                    <div
                                        className={`px-4 py-2.5 shadow-sm border text-[14.5px] leading-relaxed break-words transition-all duration-150 ${isMe
                                            ? "bg-indigo-600 text-white border-indigo-600 rounded-2xl rounded-tr-none"
                                            : "bg-white text-slate-800 border-slate-200/90 rounded-2xl rounded-tl-none"
                                            }`}
                                    >
                                        <p>{msg.text}</p>
                                    </div>

                                    {/* Bubble Info Timestamp Badge */}
                                    <div className="flex items-center gap-1.5 mt-1 px-1">
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {isMe && msg.senderId?.toString() === user?._id && (
                                            <span className={msg.seen ? "text-indigo-500" : "text-slate-400"}>
                                                {msg.seen ? <CheckCheck size={13} /> : <Check size={13} />}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Micro Animated Real-time Typing Streamer */}
                {typingUser && (
                    <div className="px-6 py-1.5 bg-gradient-to-t from-slate-50 to-transparent flex-shrink-0">
                        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-2">
                            <span className="flex space-x-1 items-center h-2">
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                            </span>
                            {typingUser} is composing...
                        </p>
                    </div>
                )}

                {/* Input form controller component block */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                    className="p-4 bg-white border-t border-slate-200/80 backdrop-blur-md flex-shrink-0"
                >
                    <div className="flex items-center gap-2 max-w-7xl mx-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200/40 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:bg-white transition-all duration-200">
                        <input
                            value={message}
                            onChange={handleTyping}
                            disabled={!selectedUser}
                            placeholder={selectedUser ? "Write your secure message..." : "Select a profile contact first..."}
                            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-slate-800 outline-none placeholder-slate-400 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || !selectedUser}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white px-4 py-2 rounded-xl font-bold text-xs tracking-wide uppercase transition-all duration-150 shadow-md shadow-indigo-600/5 active:scale-95 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default Home;