import { Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './component/Home'
import Login from './component/Login'
import Signup from './component/Signup'
import ProtectedRoute from './component/ProtectedRoute'
import { Suspense } from 'react'
import { ToastContainer } from 'react-toastify'

function App() {
  
  return (
    <>
     <p className='text-sm text-orange-400 m-3 text-center'>jai shree ram</p>  
                <ToastContainer />
       <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen fw-bold">
            <div>
              {/* <h1>
                <BeatLoader />
              </h1> */}
              <p className="text-lg font-semibold">Loading...</p>
            </div>
          </div>
        }
      >
        <Routes>
            {/* <Route index  element={<Home />} /> */}

            {/* Protected Routes */}

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
           


          {/* Open Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
        </Routes>
      </Suspense>

    </>
  )
}

export default App
