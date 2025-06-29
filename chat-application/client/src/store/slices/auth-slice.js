export const createAuthSlice = (set) => ({
    userInfo: undefined,
    setUserInfo: (userInfo) => {
        set({ userInfo });
        if (userInfo) {
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        } else {
            localStorage.removeItem('userInfo');
        }
    },
    logout: () => {
        set({ userInfo: undefined });
        localStorage.removeItem('userInfo');
    },
    initializeAuth: () => {
        const stored = localStorage.getItem('userInfo');
        if (stored) {
            set({ userInfo: JSON.parse(stored) });
        }
    },
});