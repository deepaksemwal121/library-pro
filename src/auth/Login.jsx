import React, { useState } from "react";
import supabase from "../../helpers/supabase";
import { Label } from "radix-ui";
import { Navigate, useNavigate } from "react-router";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      // Upon successful login, navigate to dashboard
      navigate("/dashboard");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleLogin}
        className="flex flex-col gap-4 max-w-sm mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <h2 className="text-3xl --base-font font-bold mb-2">Login to Library Pro</h2>

        <div className="flex flex-col gap-1.5">
          <Label.Root className="text-sm font-medium" htmlFor="email">
            Email
          </Label.Root>
          <input
            id="email"
            type="email"
            className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label.Root className="text-sm font-medium" htmlFor="password">
            Password
          </Label.Root>
          <input
            id="password"
            type="password"
            className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="mt-2 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default Login;
