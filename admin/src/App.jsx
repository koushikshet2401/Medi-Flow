import { Route, Routes, Link } from "react-router-dom";
import Hero from "./pages/Hero";
import { useUser, useClerk } from "@clerk/clerk-react";
import Home from "./pages/Home";
import Add from "./pages/Add";
import List from "./pages/List";
import Appointments from "./pages/Appointments";
import SerDashboard from "./pages/SerDashboard";
import ServiceDashboard from "./components/ServiceDashboard";
import AddSer from "./pages/AddSer";
import ListService from "./pages/ListService";
import ServiceAppointments from "./pages/ServiceAppointments";

function RequireAuth({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return null;
  if (!isSignedIn)
    return (
      <div className="min-h-screen font-mono flex items-center justify-center bg-linear-to-b from-emerald-50 via-green-50 to-emerald-100 px-4">
        <div className="text-center">
          <p className="text-emerald-800 font-semibold text-lg sm:text-2xl mb-4 animate-fade-in">
            Please Sign in to view this page
          </p>
          <div className="flex justify-center">
            <Link
              to="/"
              className="px-4 py-2 text-sm rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all duration-300 ease-in-out animate-bounce-subtle"
            >
              HOME
            </Link>
          </div>
        </div>
      </div>
    );

  const adminEmails = ["medicareproject77@gmail.com"];
  const userEmail = user.primaryEmailAddress?.emailAddress;

  if (!adminEmails.includes(userEmail)) {
    return (
      <div className="min-h-screen font-mono flex items-center justify-center bg-linear-to-b from-red-50 via-rose-50 to-red-100 px-4">
        <div className="text-center">
          <p className="text-red-800 font-semibold text-lg sm:text-2xl mb-4 animate-fade-in">
            Access Denied: You do not have admin privileges.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="px-6 py-2 text-sm font-bold rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 hover:scale-105 transition-all duration-300 ease-in-out"
            >
              LOGOUT & RETURN HOME
            </button>
            <p className="text-xs text-red-600 opacity-70">
              Current User: {userEmail}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />

      <Route
        path="/h"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/add"
        element={
          <RequireAuth>
            <Add />
          </RequireAuth>
        }
      />

      <Route
        path="/list"
        element={
          <RequireAuth>
            <List/>
          </RequireAuth>
        }
      />
      <Route
        path="/appointments"
        element={
          <RequireAuth>
            <Appointments/>
          </RequireAuth>
        }
      />


<Route
  path="/service-dashboard"
  element={
    <RequireAuth>
      <SerDashboard/>
    </RequireAuth>
  }
/>
<Route
  path="/add-service"
  element={
    <RequireAuth>
      <AddSer/>
    </RequireAuth>
  }
/>

<Route
  path="/list-service"
  element={
    <RequireAuth>
      <ListService/>
    </RequireAuth>
  }
/>


<Route
  path="/service-appointments"
  element={
    <RequireAuth>
      <ServiceAppointments/>
    </RequireAuth>
  }
/>

    </Routes>
  );
}
