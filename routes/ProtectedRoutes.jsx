import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import supabase from "../helpers/supabase";

const ProtectedRoutes = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="grid w-full h-screen  place-items-center ">
        <div className="flex flex-row gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce"></div>
          <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce [animation-delay:-.3s]"></div>
          <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce [animation-delay:-.5s]"></div>
        </div>
      </div>
    );
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoutes;
