
import { supabase, unregisterZunePushToken } from "./supabase.js";

/* =================================
   ZUNE AUTHENTICATION
================================= */

// Enforce the marketplace password policy before calling Supabase Auth.
// Supabase Auth remains the server-side authority for password validation.
function assertStrongPassword(value) {
  const password = String(value || "");
  const valid = password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    !/\s/.test(password);

  if (!valid) {
    throw new Error("Password must be at least 8 characters and include uppercase and lowercase letters, a number, and a symbol, with no spaces.");
  }
}

// SIGN UP

export async function registerCustomer(customer) {
  assertStrongPassword(customer?.password);
  const {
    firstName,
    middleName,
    lastName,
    phone,
    email,
    password
  } = customer;

  const fullName = [
    firstName,
    middleName,
    lastName
  ].join(" ").trim();

  const redirectURL = new URL(
    "./",
    window.location.href
  ).href;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,

    options: {
      emailRedirectTo: redirectURL,

      data: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        full_name: fullName,
        phone: phone,
        account_type: "buyer"
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}


// LOGIN

export async function loginCustomer(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

  if (error) {
    throw error;
  }

  return data;
}


// FORGOT PASSWORD

export async function recoverPassword(email) {
  const redirectURL = new URL(
    "./",
    window.location.href
  ).href;

  const { data, error } =
    await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: redirectURL
      }
    );

  if (error) {
    throw error;
  }

  return data;
}


// GET CURRENT SESSION

export async function getCustomerSession() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}


// GET CURRENT CUSTOMER

export async function getCurrentCustomer() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}


// LOGOUT

export async function logoutCustomer() {
  try { await unregisterZunePushToken(); }
  catch (error) { console.warn("ZUNE push token cleanup:", error); }
  const { error } =
    await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw error;
  }
}


// AUTHENTICATION LISTENER

export function listenToAuthChanges(callback) {
  return supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );
}
