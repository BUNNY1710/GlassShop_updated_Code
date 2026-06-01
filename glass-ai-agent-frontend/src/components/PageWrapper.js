// function PageWrapper({ background, children }) {
//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         backgroundImage: `url(${background})`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         position: "relative",
//       }}
//     >
//       {/* Overlay */}
//       <div
//         style={{
//           position: "absolute",
//           inset: 0,
//           background: "rgba(0,0,0,0.6)",
//           zIndex: 0,
//         }}
//       />

//       {/* Content */}
//       <div
//         style={{
//           position: "relative",
//           zIndex: 1,
//           minHeight: "calc(100vh - 64px)",
//           padding:  "clamp(12px, 4vw, 40px)",
//           color: "white",
//         }}
//       >
//         {children}
//       </div>
//     </div>
//   );
// }

// export default PageWrapper;

/**
 * PageWrapper — clean content container.
 * Background images removed; consistent light #f8fafc page bg from Layout.js.
 * The `background` / `backgroundImage` props are kept for API compatibility
 * but are intentionally ignored — all pages now share the same clean design.
 */
function PageWrapper({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 24px 48px",
          width: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PageWrapper;
