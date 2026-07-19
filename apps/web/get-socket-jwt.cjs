const fetch = globalThis.fetch;

if (!fetch) {
  throw new Error('Global fetch is not available in this Node runtime.');
}

const email = `socket-test-${Date.now()}@example.com`;
const password = 'Test1234!';
const name = 'Socket Test User';
const baseUrl = 'http://localhost:4000';

async function register() {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  return res.json();
}

async function login() {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

(async () => {
  try {
    const registerData = await register();
    if (!registerData.token) {
      console.error('Register failed:', JSON.stringify(registerData, null, 2));
      process.exit(1);
    }
    console.log('REGISTERED', JSON.stringify(registerData, null, 2));

    const loginData = await login();
    if (!loginData.token) {
      console.error('Login failed:', JSON.stringify(loginData, null, 2));
      process.exit(1);
    }

    console.log('LOGIN_OK');
    console.log('TOKEN=' + loginData.token);
    console.log('USER_ID=' + loginData.user.id);
    console.log('EMAIL=' + email);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
