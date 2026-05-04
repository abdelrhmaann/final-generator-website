import { useEffect, useState } from "react";

export interface ProjectInfo {
  projectName: string;
  engineerName: string;
  projectRef: string;
  date: string;
}

const KEY = "gensizer.project";
const empty: ProjectInfo = { projectName: "", engineerName: "", projectRef: "", date: "" };

export function useProject(): [ProjectInfo, (p: ProjectInfo) => void] {
  const [p, setP] = useState<ProjectInfo>(empty);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setP({ ...empty, ...JSON.parse(raw) });
      else setP({ ...empty, date: new Date().toISOString().slice(0, 10) });
    } catch { /* noop */ }
  }, []);
  const save = (next: ProjectInfo) => {
    setP(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  };
  return [p, save];
}