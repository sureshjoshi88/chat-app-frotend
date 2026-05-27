import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authProvider";
const BASE_URL = import.meta.env.VITE_BASE_URL;
const Login = () => {
    
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const navigate = useNavigate();
        const { login } = useAuth();



    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await axios.post(
                `${ BASE_URL}auth/login`,
                form
            );

            setMessage(res.data.message);
            // localStorage.setItem("token", JSON.stringify(res.data.token))
            // localStorage.setItem("user", JSON.stringify(res.data.user))
            login(res?.data?.token,res?.data?.user)
            navigate("/")


        } catch (error) {
            setMessage(error.response?.data?.message || "Error");
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">

            <div                 className="bg-white p-8 rounded-xl shadow-md w-96"
>

            
            <form
                onSubmit={handleSubmit}
            >
                <h2 className="text-2xl font-bold mb-6 text-center">
                    Login
                </h2>

                {/* Email */}
                <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                />

                {/* Password */}
                <input
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                />

                {/* Button */}
                <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700"
                >
                    Login
                </button>
             

                {/* Message */}
                {message && (
                    <p className="mt-4 text-center text-sm text-red-500">
                        {message}
                    </p>
                )}
            </form>
               <button
                    type="submit"
                    onClick={()=>navigate("/register")}
                    className="w-full bg-indigo-600 text-white py-3 mt-3 rounded-lg hover:bg-indigo-700"
                >
                    Sig In
                </button>
              
            </div>
        </div>
    );
};

export default Login;