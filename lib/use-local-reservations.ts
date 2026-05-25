"use client";

import { useEffect, useState } from "react";

export function useLocalReservations() {
  const [resIds, setResIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("allo_my_reservations") || "[]");
    setResIds(stored);
  }, []);

  const addReservation = (id: string) => {
    const stored = JSON.parse(localStorage.getItem("allo_my_reservations") || "[]");
    if (!stored.includes(id)) {
      const newStored = [id, ...stored];
      localStorage.setItem("allo_my_reservations", JSON.stringify(newStored));
      setResIds(newStored);
    }
  };

  return { resIds, addReservation };
}
