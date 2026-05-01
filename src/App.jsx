import "./App.css";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "../routes/router";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
