// ============================================================
//  Instagram Comment → Auto DM Bot
//  Multiple keywords, each with its own custom message
// ============================================================

const express = require('express');
const axios   = require('axios');
const app     = express();

app.use(express.json());

// ── Your settings ───────────────────────────────────────────
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// ── Keyword → Message Map ───────────────────────────────────
const KEYWORD_MESSAGES = {
  "bank9": "يسعدنا انضمامك الى بنك الاسئلة في 26 Academy   Username: questionbank  Password: 1234  https://26-academy.com/course/questionbank-free/",
  "v9":    "Welcome to 26 Academy 🎓\nرابط الحفظيات: https://26-academy.com/wp-content/uploads/2026/05/Grade-11-Vocabulary.pdf",
};

// ── Get Instagram User ID on startup ───────────────────────
let IG_USER_ID = null;

async function getInstagramUserId() {
  try {
    const res = await axios.get('https://graph.instagram.com/me', {
      params: { access_token: ACCESS_TOKEN, fields: 'id,username' }
    });
    IG_USER_ID = res.data.id;
    console.log(`✅ Connected as Instagram user: @${res.data.username} (ID: ${IG_USER_ID})`);
  } catch (error) {
    console.error('❌ Could not fetch Instagram User ID:', error.response?.data || error.message);
  }
}

getInstagramUserId();


// ── Step 1: Meta verifies your server ──────────────────────
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


// ── Step 2: Receive comment events ─────────────────────────
app.post('/webhook', async (req, res) => {
  const body = req.body;

  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {

      if (change.field !== 'comments') continue;

      const commentText       = (change.value.text || '').toLowerCase().trim();
      const commenterId       = change.value.from?.id;
      const commenterUsername = change.value.from?.username || 'someone';

      console.log(`💬 New comment from @${commenterUsername}: "${commentText}"`);

      const matchedMessage = getMatchingMessage(commentText);

      if (matchedMessage && commenterId) {
        console.log(`🎯 Keyword matched! Sending DM to @${commenterUsername}...`);
        await sendDM(commenterId, commenterUsername, matchedMessage);
      } else {
        console.log(`⏭️ No keyword matched — ignoring comment`);
      }
    }
  }
});


// ── Find which keyword matches the comment ──────────────────
function getMatchingMessage(commentText) {
  for (const [keyword, message] of Object.entries(KEYWORD_MESSAGES)) {
    if (commentText.includes(keyword.toLowerCase())) {
      return message;
    }
  }
  return null;
}


// ── Send the DM using Instagram Graph API ──────────────────
async function sendDM(userId, username, message) {
  if (!IG_USER_ID) {
    console.error('❌ Instagram User ID not loaded yet');
    return;
  }

  try {
    await axios.post(
      `https://graph.instagram.com/v19.0/${IG_USER_ID}/messages`,
      {
        recipient: { id: userId },
        message:   { text: message }
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


// ── Start the server ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot is running on port ${PORT}`);
  console.log(`📌 Active keywords: ${Object.keys(KEYWORD_MESSAGES).join(', ')}`);
});
