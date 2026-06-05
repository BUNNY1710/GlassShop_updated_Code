/**
 * PageWrapper — clean content container.
 * Background images removed; dark theme applied via Layout.js.
 * The `background` / `backgroundImage` props are kept for API compatibility
 * but are intentionally ignored — all pages share the same dark design.
 */
function PageWrapper({ children, style: extra = {}, ...rest }) {
  return (
    <div style={{ padding: "16px 16px 24px", minHeight: "100vh", ...extra }} {...rest}>
      {children}
    </div>
  );
}

export default PageWrapper;
