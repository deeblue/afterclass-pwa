import { create } from "zustand";
import { get, set, del } from "idb-keyval";
import type { AttemptUp } from "../types";

const DB_KEY = "afterclass_attempt_queue_v1";

type QueueState = {
  enqueue: (payload: AttemptUp[]) => Promise<void>;
  flush: (sender: (payload: AttemptUp[]) => Promise<void>) => Promise<void>;
  size: () => Promise<number>;
  peek: () => Promise<AttemptUp[]>;
  clear: () => Promise<void>;
};

export const useQueue = create<QueueState>(() => ({
  enqueue: async (payload) => {
    const cur = (await get<AttemptUp[]>(DB_KEY)) ?? [];
    await set(DB_KEY, [...cur, ...payload]);
  },

  flush: async (sender) => {
    const cur = (await get<AttemptUp[]>(DB_KEY)) ?? [];
    if (!cur.length) return;
    // 交給呼叫端（通常是 API：/api/attempts/bulk）
    await sender(cur);
    // 成功才清空（失敗就保留，待下次再送）
    await del(DB_KEY);
  },

  size: async () => {
    const cur = (await get<AttemptUp[]>(DB_KEY)) ?? [];
    return cur.length;
  },

  peek: async () => {
    const cur = (await get<AttemptUp[]>(DB_KEY)) ?? [];
    return cur;
  },

  clear: async () => {
    await del(DB_KEY);
  }
}));
