import { useState, useEffect, useCallback } from "react";
import api from "./api";

// ─── Glass Type Master API ──────────────────────────────────────────────────
export const getGlassTypes   = () => api.get("/api/glass-types").then(r => r.data);
export const createGlassType = (name) => api.post("/api/glass-types", { name }).then(r => r.data);
export const updateGlassType = (id, name) => api.put(`/api/glass-types/${id}`, { name }).then(r => r.data);
export const deleteGlassType = (id) => api.delete(`/api/glass-types/${id}`).then(r => r.data);
export const getGlassTypeDeleteInfo = (id) => api.get(`/api/glass-types/${id}/delete-info`).then(r => r.data);
export const restoreGlassType = (id) => api.post(`/api/glass-types/${id}/restore`).then(r => r.data);

// ─── Low-stock alerts ───────────────────────────────────────────────────────
export const getGlassTypeAlerts = () => api.get("/api/glass-types/alerts").then(r => r.data);
export const updateGlassTypeAlert = (id, body) => api.patch(`/api/glass-types/${id}/alert`, body).then(r => r.data);

// Fallback catalogue so dropdowns never go empty if the API is briefly unreachable.
export const DEFAULT_GLASS_TYPES = [
  "Plain", "Extra Clear", "Grey Tinted", "Brown Tinted", "One Way",
  "Star", "Karakachi", "Bajari", "Diomand", "Mirror", "Toughened", "Lacquered",
];

// Shared hook: load the shop's glass-type master once, expose names + reload.
export function useGlassTypes() {
  const [glassTypes, setGlassTypes] = useState([]); // [{ id, name, isActive }]
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlassTypes();
      setGlassTypes(Array.isArray(data) && data.length
        ? data
        : DEFAULT_GLASS_TYPES.map((name, i) => ({ id: `d${i}`, name })));
    } catch {
      setGlassTypes(DEFAULT_GLASS_TYPES.map((name, i) => ({ id: `d${i}`, name })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { glassTypes, names: glassTypes.map(t => t.name), loading, reload };
}
