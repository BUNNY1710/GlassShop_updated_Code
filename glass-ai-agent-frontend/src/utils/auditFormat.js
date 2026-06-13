// Shared audit/activity formatting — used by the Audit Log page and the staff
// Activities view so descriptions/labels stay consistent.

export function describeActivity(log) {
  if (log.details) return log.details; // stored free-text wins
  const glass = [log.glassType, log.thickness ? `${+log.thickness}MM` : ""].filter(Boolean).join(" ");
  const size  = log.height && log.width ? `${log.height}×${log.width} ${log.unit || "MM"}` : "";
  const qty   = log.quantity ? `${log.quantity} unit${+log.quantity !== 1 ? "s" : ""}` : "";

  switch ((log.action || "").toUpperCase()) {
    case "ADD":      return `Added ${qty} of ${glass}${size ? ` (${size})` : ""} to Stand #${log.standNo || "?"}`;
    case "REMOVE":   return `Removed ${qty} of ${glass}${size ? ` (${size})` : ""} from Stand #${log.standNo || "?"}`;
    case "EDIT":     return `Updated ${glass}${size ? ` · ${size}` : ""}${log.standNo ? ` at Stand #${log.standNo}` : ""}`;
    case "TRANSFER": return `Transferred ${qty} of ${glass} · Stand #${log.fromStand || "?"} → Stand #${log.toStand || "?"}`;
    case "ADD_REMNANT": return `Added remnant stock ${glass}${size ? ` (${size})` : ""} to Stand #${log.standNo || "?"}`;
    case "OPTIMIZE_CONFIRM":
      return glass
        ? `Optimization confirmed · ${qty} of ${glass}${size ? ` (${size})` : ""} from Stand #${log.standNo || "?"}`
        : "Optimization confirmed";
    case "DELETE_STAND": {
      if (!log.toStand) return `Deleted Stand #${log.fromStand || log.standNo || "?"}`;
      const what = glass ? `${qty || "0 units"} of ${glass}${size ? ` (${size})` : ""}` : (qty || "0 units");
      return `Transferred ${what} from Stand #${log.fromStand} to Stand #${log.toStand}, then deleted Stand #${log.fromStand}`;
    }
    case "DELETE_GLASS_TYPE":  return `Deleted Glass Type “${log.glassType || "?"}”`;
    case "RESTORE_GLASS_TYPE": return `Restored Glass Type “${log.glassType || "?"}”`;
    default: return `${log.action || "Action"}${glass ? ` on ${glass}` : ""}${size ? ` (${size})` : ""}`;
  }
}

// action -> { label, module, color } for badges, timeline labels and grouping.
export const ACTION_META = {
  ADD:                     { label: "Added Stock",            module: "Stock",        color: "#37E3A5" },
  REMOVE:                  { label: "Removed Stock",          module: "Stock",        color: "#FF6B81" },
  EDIT:                    { label: "Edited Stock",           module: "Stock",        color: "#818CF8" },
  ADD_REMNANT:             { label: "Added Remnant",          module: "Stock",        color: "#FF9F40" },
  UPDATE_STOCK_ALERT:      { label: "Updated Stock Alert",    module: "Stock",        color: "#FFB95E" },
  TRANSFER:                { label: "Transferred Stock",      module: "Transfers",    color: "#FFB95E" },
  OPTIMIZE_CONFIRM:        { label: "Confirmed Optimization", module: "Optimization", color: "#A78BFA" },
  CREATE_QUOTATION:        { label: "Created Quotation",      module: "Quotations",   color: "#37E3A5" },
  EDIT_QUOTATION:          { label: "Edited Quotation",       module: "Quotations",   color: "#818CF8" },
  DELETE_QUOTATION:        { label: "Deleted Quotation",      module: "Quotations",   color: "#FF6B81" },
  CREATE_INVOICE:          { label: "Created Order",          module: "Orders",       color: "#37E3A5" },
  CREATE_CUSTOMER:         { label: "Created Customer",       module: "Customers",    color: "#37E3A5" },
  UPDATE_CUSTOMER:         { label: "Updated Customer",       module: "Customers",    color: "#818CF8" },
  DELETE_CUSTOMER:         { label: "Deleted Customer",       module: "Customers",    color: "#FF6B81" },
  ADD_STAND:               { label: "Added Stand",            module: "Stands",       color: "#37E3A5" },
  EDIT_STAND:              { label: "Edited Stand",           module: "Stands",       color: "#818CF8" },
  DISABLE_STAND:           { label: "Disabled Stand",         module: "Stands",       color: "#FFB95E" },
  DELETE_STAND:            { label: "Deleted Stand",          module: "Stands",       color: "#FF6B81" },
  ADD_GLASS_TYPE:          { label: "Added Glass Type",       module: "Glass Types",  color: "#37E3A5" },
  EDIT_GLASS_TYPE:         { label: "Edited Glass Type",      module: "Glass Types",  color: "#818CF8" },
  DELETE_GLASS_TYPE:       { label: "Deleted Glass Type",     module: "Glass Types",  color: "#FF6B81" },
  RESTORE_GLASS_TYPE:      { label: "Restored Glass Type",    module: "Glass Types",  color: "#37E3A5" },
  STAFF_PERMISSION_UPDATED:{ label: "Updated Permissions",    module: "Staff",        color: "#818CF8" },
  CREATE_STAFF:            { label: "Created Staff",          module: "Staff",        color: "#37E3A5" },
  CREATE_ADMIN:            { label: "Created Admin",          module: "Staff",        color: "#37E3A5" },
  DELETE_ADMIN:            { label: "Deleted Admin",          module: "Staff",        color: "#FF6B81" },
  USER_LOGIN:              { label: "Logged In",              module: "User",         color: "#7180A6" },
  USER_LOGOUT:             { label: "Logged Out",             module: "User",         color: "#7180A6" },
  PASSWORD_CHANGE:         { label: "Changed Password",       module: "User",         color: "#7180A6" },
};

export const actionMeta = (action) =>
  ACTION_META[(action || "").toUpperCase()] || { label: action || "Activity", module: "Other", color: "#7180A6" };
