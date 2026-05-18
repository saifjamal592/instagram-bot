// ============================================================
//  Instagram Comment → Auto DM Bot
//  No coding knowledge needed — just fill in your .env file
// ============================================================

const express = require('express');
const axios   = require('axios');
const app     = express();

app.use(express.json());

// ── Load your settings from the .env file ──────────────────
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;   // You make this up (any word)
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;   // From Meta App dashboard
const KEYWORD      = process.env.KEYWORD;        // e.g. "LINK" or "INFO"
const DM_MESSAGE   = process.env.DM_MESSAGE;     // The message + link to send


// ── Step 1: Meta verifies your server is real ──────────────
// Meta calls this once when you paste your webhook URL in the dashboard.
// It checks your VERIFY_TOKEN and says "yes, this server belongs to you."
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Verification failed — check your VERIFY_TOKEN');
    res.sendStatus(403);
  }
});


// ── Step 2: Receive comment events from Instagram ──────────
// Every time someone comments on your post, Instagram sends
// the comment details here automatically.
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Always respond quickly so Meta knows we received it
  res.status(200).send('EVENT_RECEIVED');

  // Only handle Instagram events
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {

      // We only care about new comments
      if (change.field !== 'comments') continue;

      const commentText  = (change.value.text || '').toLowerCase();
      const commenterId  = change.value.from?.id;
      const commenterUsername = change.value.from?.username || 'someone';

      console.log(`💬 New comment from @${commenterUsername}: "${commentText}"`);

      // Check if the comment contains the trigger keyword
      if (commentText.includes(KEYWORD.toLowerCase()) && commenterId) {
        console.log(`🎯 Keyword "${KEYWORD}" detected! Sending DM...`);
        await sendDM(commenterId, commenterUsername);
      }
    }
  }
});


// ── Step 3: Send the DM ────────────────────────────────────
async function sendDM(userId, username) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: userId },
        message:   { text: DM_MESSAGE }
      },
      {
        params: { access_token: ACCESS_TOKEN }
      }
    );
    console.log(`✅ DM sent successfully to @${username}`);

  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ Failed to send DM to @${username}: ${errMsg}`);
  }
}


// ── Start the server ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot is running on port ${PORT}`);
  console.log(`📌 Keyword trigger: "${KEYWORD}"`);
  console.log(`📨 DM message ready`);
});
