// import api from "./api.js";

// const TOKEN_KEY = "fems_token";

// export async function register(user) {
//   return api.request("/register", {
//     method: "POST",
//     headers: {"Content-Type": "application/json"},
//     body: JSON.stringify(user)
//   });
// }

// export async function login(email, password) {
//   const res = await api.request("/login", {
//     method: "POST",
//     headers: {"Content-Type": "application/json"},
//     body: JSON.stringify({email, password})
//   });
//   localStorage.setItem(TOKEN_KEY, res.token);
//   return res;
// }

// export function getToken() {
//   return localStorage.getItem(TOKEN_KEY);
// }

// export async function getProfile() {
//   const token = getToken();
//   if (!token) throw new Error("No token");
//   return api.request("/profile", {
//     method: "GET",
//     headers: { Authorization: `Bearer ${token}` }
//   });
// }
