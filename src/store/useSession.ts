import { create } from "zustand";

function uuid() {
  // 瀏覽器原生 UUID
  return (crypto as any)?.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

type SessionState = {
  userId: string;
  deviceId: string;
  sessionId: string;
  setUserId: (id: string) => void;
  renewSession: () => void;
};

export const useSession = create<SessionState>((set) => {
  // deviceId 永久化（localStorage）
  let deviceId = localStorage.getItem("afterclass_device_id") || "";
  if (!deviceId) {
    deviceId = uuid();
    localStorage.setItem("afterclass_device_id", deviceId);
  }

  // userId 預設 anon，可在設定頁修改
  const initUser = localStorage.getItem("afterclass_user_id") || "anon";

  return {
    userId: initUser,
    deviceId,
    sessionId: uuid(),
    setUserId: (id: string) => {
      localStorage.setItem("afterclass_user_id", id);
      set({ userId: id });
    },
    renewSession: () => set({ sessionId: uuid() })
  };
});
