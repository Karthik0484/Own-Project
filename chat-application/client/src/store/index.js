import { create } from "zustand";
import { createAuthSlice } from "./slices/auth-slice";
import { createChatSlice } from "./slices/chat-slice";
import { createNotificationsSlice } from "./slices/notifications-slice";

export const useAppStore = create()((...a) => ({
    ...createAuthSlice(...a),
    ...createChatSlice(...a),
    ...createNotificationsSlice(...a),
}));