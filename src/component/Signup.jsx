import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authProvider";
const BASE_URL = import.meta.env.VITE_BASE_URL;
import {  toast } from 'react-toastify';


const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const { login } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${BASE_URL}auth/signup`,
        form
      );

       if (res.data.success) {
      toast.success("Signup Successfully");
      login(res?.data?.token, res?.data?.user)
      navigate("/login")
    } else {
      toast.error(res.data.message);
    }
      setMessage(res.data.message);

    } catch (error) {
      setMessage(error.response?.data?.message || "Server Error");
      toast.error(error.response?.data?.message || "Server error");
    }
  };

  return (
    <>

  
    <div className="flex justify-center items-center h-screen bg-gray-100">

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Create Account
        </h2>

        {/* Name */}
        <input
          type="text"
          name="name"
          placeholder="Enter your name"
          value={form.name}
          onChange={handleChange}
          className="w-full mb-4 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
        />

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
          Sign Up
        </button>

        {/* Message */}
        {message && (
          <p className="mt-4 text-center text-sm text-red-500">
            {message}
          </p>
        )}
      </form>
    </div>
      </>
  );
};

export default Signup;