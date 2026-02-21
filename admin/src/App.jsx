import { Route, Routes } from "react-router-dom";
import Hero from "./pages/hero";

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Hero/>}/>
    </Routes>
  );
}
