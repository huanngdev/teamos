import { Navigate, Route, Routes } from "react-router";

import { HomePage } from "@/pages";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export { AppRoutes };
