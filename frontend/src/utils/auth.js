// Hardcoded credentials
const HARDCODED_EMAIL = 'admin@kins.com';
const HARDCODED_PASSWORD = 'password123';

export const authService = {
  login: (email, password) => {
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
          const user = {
            email: HARDCODED_EMAIL,
            name: 'Admin User',
            role: 'admin',
          };
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('isAuthenticated', 'true');
          resolve(user);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 500);
    });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  },

  isAuthenticated: () => {
    return localStorage.getItem('isAuthenticated') === 'true';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
