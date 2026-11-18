import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PatientTokenPage } from "@/pages/PatientTokenPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/patient" element={<PatientTokenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
