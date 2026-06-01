import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_EMAIL, or TEST_PASSWORD.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log("Checking existing test user...");

const { data: listData, error: listError } = await admin.auth.admin.listUsers();

if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}

const existingUser = listData.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (existingUser) {
  console.log("Existing user found:", existingUser.id);

  await admin
    .from("entitlement_snapshots")
    .delete()
    .eq("user_id", existingUser.id);

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(existingUser.id);

  if (deleteUserError) {
    console.error("Could not delete old user:", deleteUserError.message);
    process.exit(1);
  }

  console.log("Old test user deleted.");
}

console.log("Creating confirmed test user...");

const { data: createdData, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError || !createdData.user) {
  console.error("Could not create test user:", createError?.message || "No user returned");
  process.exit(1);
}

const user = createdData.user;

console.log("Created user UID:", user.id);
console.log("Email confirmed at:", user.email_confirmed_at || "MISSING");

console.log("Adding monthly entitlement snapshot...");

const { error: insertError } = await admin
  .from("entitlement_snapshots")
  .insert({
    user_id: user.id,
    revenuecat_customer_id: "manual-test-user",
    has_monthly: true,
    reading_credits: 0,
    active_product_ids: ["auralens_monthly_799"],
    raw: {
      source: "manual_live_ai_buddy_test",
      createdBy: "setup_script"
    },
  });

if (insertError) {
  console.error("Could not insert entitlement snapshot:", insertError.message);
  process.exit(1);
}

const { data: sanity, error: sanityError } = await admin
  .from("entitlement_snapshots")
  .select("user_id, has_monthly, reading_credits, active_product_ids")
  .eq("user_id", user.id);

if (sanityError) {
  console.error("Sanity check failed:", sanityError.message);
  process.exit(1);
}

console.log("Sanity check result:");
console.log(JSON.stringify(sanity, null, 2));

console.log("");
console.log("DONE — test user and monthly entitlement ready.");