import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Vocal from "./Vocal.jsx";

<Routes>
  <Route path="/" element={<App />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="/vocal" element={<Vocal />} />
</Routes>

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);