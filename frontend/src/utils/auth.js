// Hardcoded CRM demo logins (same password). Prefer env in production if added later.
const ADMIN_ACCOUNTS = [
  { email: 'admin@kins.com', password: 'password123' },
  { email: 'admin@vyooo.com', password: 'password123' },
];

function matchAdmin(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  return ADMIN_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalized && a.password === password
  );
}

export const authService = {
  login: (email, password) => {
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        const account = matchAdmin(email, password);
        if (account) {
          const user = {
            email: account.email,
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
