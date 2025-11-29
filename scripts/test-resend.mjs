import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  console.log("Testing Resend email...");
  console.log("API Key configured:", !!process.env.RESEND_API_KEY);
  console.log(
    "From email:",
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
  );

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: "mmuter4@gmail.com",
      subject: "Fishon Email Test - Resend Working! 🎣",
      html: `
        <h1>Email Test Successful!</h1>
        <p>Your Resend integration is working correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
        <p style="color: #666;">This is a test from fishon-market</p>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      process.exit(1);
    } else {
      console.log("✅ Success! Email sent:", data);
    }
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
}

test();
