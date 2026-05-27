import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [token, setToken] = useState(
        localStorage.getItem("token") || null
    );

    // LOGIN
    const login = (newToken, user) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(user))
        setToken(newToken);
    };

    // LOGOUT
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                login,
                logout,
                isAuthenticated: !!token
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// custom hook
export const useAuth = () => useContext(AuthContext);