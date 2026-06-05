import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar, { SIDEBAR_W } from "../components/Navbar";

function Layout() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const r = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #07122D 0%, #040A18 100%)",
      backgroundAttachment: "fixed",
    }}>
      <Navbar />
      <div style={{
        flex: 1,
        minWidth: 0,
        marginLeft: isDesktop ? SIDEBAR_W : 0,
        paddingTop: isDesktop ? 0 : 56,
        paddingBottom: 0,
        overflowX: "hidden",
      }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
