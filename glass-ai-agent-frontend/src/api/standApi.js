import { useState, useEffect, useCallback } from "react";
import api from "./api";

// ─── Stand Master API ───────────────────────────────────────────────────────
export const getStands       = (all = false) => api.get(`/api/stands${all ? "?all=true" : ""}`).then(r => r.data);
export const createStand     = (payload) => api.post("/api/stands", payload).then(r => r.data);
export const updateStand     = (id, payload) => api.put(`/api/stands/${id}`, payload).then(r => r.data);
export const setStandActive  = (id, isActive) => api.patch(`/api/stands/${id}/active`, { isActive }).then(r => r.data);
export const deleteStand     = (id) => api.delete(`/api/stands/${id}`).then(r => r.data);

// Shared hook: load the shop's active stands once, expose numbers + reload.
export function useStands() {
  const [stands, setStands] = useState([]); // [{ id, standNumber, standName, isActive }]
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStands(false);
      setStands(Array.isArray(data) ? data : []);
    } catch {
      setStands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return {
    stands,
    standNumbers: stands.map(s => s.standNumber),
    loading,
    reload,
  };
}
