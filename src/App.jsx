import "./App.css";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "../routes/router";
import { ToastProvider } from "./components/ui/Toast";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
