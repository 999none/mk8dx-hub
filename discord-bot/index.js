/**
 * MK8DX Squad Queue Schedule Bot
 * 
 * Ce bot écoute le salon "schedule" qui suit le #sq-schedule du MK8DX Lounge.
 * Il parse les messages de planning et met à jour le fichier JSON sur GitHub.
 * 
 * Format des messages du Lounge:
 * #ID 12p FORMAT : <t:TIMESTAMP:f> - <t:TIMESTAMP:R>
 * Exemple: #4243 12p 2v2 : <t:1769941200:f> - <t:1769941200:R>
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Octokit } = require('@octokit/rest');

// Configuration
const CONFIG = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    scheduleChannelId: process.env.DISCORD_SCHEDULE_CHANNEL_ID,
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || '999none',
    repo: process.env.GITHUB_REPO || 'mk8dx-hub',
    branch: process.env.GITHUB_BRANCH || 'emergent',
    filePath: process.env.GITHUB_FILE_PATH || 'data/sq-schedule.json',
  },
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!CONFIG.discord.token) missing.push('DISCORD_BOT_TOKEN');
  if (!CONFIG.discord.scheduleChannelId) missing.push('DISCORD_SCHEDULE_CHANNEL_ID');
  if (!CONFIG.github.token) missing.push('GITHUB_TOKEN');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
  }
}

validateConfig();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Initialize Octokit (GitHub API)
const octokit = new Octokit({
  auth: CONFIG.github.token,
});

// In-memory storage for accumulating schedule entries
let pendingScheduleEntries = [];
let updateTimeout = null;
const UPDATE_DELAY = 5000; // Wait 5 seconds after last message before pushing to GitHub

/**
 * Parse a schedule message line and extract SQ data
 * Supports multiple formats:
 * - Original: #ID 12p FORMAT : <t:TIMESTAMP:f>
 * - New format: `#ID` **12p FORMAT:** <t:TIMESTAMP:F>
 * 
 * @param {string} line - A single line from the schedule message
 * @returns {object|null} - Parsed SQ entry or null if not matching
 */
function parseScheduleLine(line) {
  // Try multiple regex patterns
  
  // Pattern 1: New format with backticks and bold
  // `#4255` **12p 4v4:** <t:1770386400:F>
  const newFormatRegex = /`#(\d+)`\s*\*\*\d+p\s+(\dv\d):\*\*\s*<t:(\d+):[fF]>/i;
  let match = line.match(newFormatRegex);
  
  if (match) {
    const [, id, format, timestamp] = match;
    console.log(`      🎯 Matched new format: #${id} ${format}`);
    return {
      id: id,
      format: format.toLowerCase(),
      time: parseInt(timestamp, 10) * 1000,
    };
  }
  
  // Pattern 2: Original format
  // #4243 12p 2v2 : <t:1769941200:f>
  const originalRegex = /#(\d+)\s+\d+p\s+(\dv\d)\s*:\s*<t:(\d+):[fF]>/i;
  match = line.match(originalRegex);
  
  if (match) {
    const [, id, format, timestamp] = match;
    console.log(`      🎯 Matched original format: #${id} ${format}`);
    return {
      id: id,
      format: format.toLowerCase(),
      time: parseInt(timestamp, 10) * 1000,
    };
  }
  
  return null;
}

/**
 * Parse all schedule entries from a message content
 * @param {string} content - Message content
 * @returns {array} - Array of parsed SQ entries
 */
function parseScheduleMessage(content) {
  // Ignore messages containing @everyone
  if (content.includes('@everyone')) {
    console.log('⏭️  Ignoring message with @everyone');
    return [];
  }
  
  const lines = content.split('\n');
  const entries = [];
  
  for (const line of lines) {
    const entry = parseScheduleLine(line.trim());
    if (entry) {
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Get current schedule from GitHub
 * @returns {Promise<{data: array, sha: string|null}>}
 */
async function getGitHubSchedule() {
  try {
    const response = await octokit.repos.getContent({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      path: CONFIG.github.filePath,
      ref: CONFIG.github.branch,
    });
    
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);
    
    return {
      data: Array.isArray(data) ? data : [],
      sha: response.data.sha,
    };
  } catch (error) {
    if (error.status === 404) {
      console.log('📄 File does not exist yet, will create new one');
      return { data: [], sha: null };
    }
    throw error;
  }
}

/**
 * Merge new entries with existing schedule (no duplicates by ID)
 * @param {array} existing - Existing schedule entries
 * @param {array} newEntries - New entries to add
 * @returns {array} - Merged schedule
 */
function mergeScheduleEntries(existing, newEntries) {
  const scheduleMap = new Map();
  
  // Add existing entries
  for (const entry of existing) {
    scheduleMap.set(entry.id, entry);
  }
  
  // Add/update with new entries (overwrites if ID exists)
  for (const entry of newEntries) {
    scheduleMap.set(entry.id, entry);
  }
  
  // Convert back to array and sort by time
  return Array.from(scheduleMap.values()).sort((a, b) => a.time - b.time);
}

/**
 * Update the schedule file on GitHub
 * @param {array} newEntries - New schedule entries to merge
 */
async function updateGitHubSchedule(newEntries) {
  if (newEntries.length === 0) {
    console.log('⚠️  No new entries to update');
    return;
  }
  
  try {
    console.log(`📡 Fetching current schedule from GitHub...`);
    const { data: existingData, sha } = await getGitHubSchedule();
    
    console.log(`📊 Existing entries: ${existingData.length}, New entries: ${newEntries.length}`);
    
    // Merge entries
    const mergedSchedule = mergeScheduleEntries(existingData, newEntries);
    
    console.log(`📝 Total entries after merge: ${mergedSchedule.length}`);
    
    // Prepare content
    const content = JSON.stringify(mergedSchedule, null, 2);
    const contentBase64 = Buffer.from(content).toString('base64');
    
    // Create or update file
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: CONFIG.github.owner,
      repo: CONFIG.github.repo,
      path: CONFIG.github.filePath,
      message: `🗓️ Update SQ Schedule - ${newEntries.length} new entries`,
      content: contentBase64,
      sha: sha, // Required for updates, null for new files
      branch: CONFIG.github.branch,
    });
    
    console.log(`✅ Schedule updated on GitHub!`);
    console.log(`   Commit: ${response.data.commit.sha.substring(0, 7)}`);
    console.log(`   URL: ${response.data.content.html_url}`);
    
  } catch (error) {
    console.error('❌ Failed to update GitHub:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message);
    }
  }
}

/**
 * Schedule a delayed update to GitHub
 * This allows multiple messages to be accumulated before pushing
 */
function scheduleGitHubUpdate() {
  // Clear any existing timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // Set new timeout
  updateTimeout = setTimeout(async () => {
    if (pendingScheduleEntries.length > 0) {
      console.log(`\n⏰ Update timeout reached, pushing ${pendingScheduleEntries.length} entries to GitHub...`);
      
      const entriesToPush = [...pendingScheduleEntries];
      pendingScheduleEntries = []; // Clear pending entries
      
      await updateGitHubSchedule(entriesToPush);
    }
  }, UPDATE_DELAY);
}

// Discord Events
client.once('ready', () => {
  console.log('\n========================================');
  console.log('🤖 MK8DX SQ Schedule Bot is online!');
  console.log('========================================');
  console.log(`📛 Logged in as: ${client.user.tag}`);
  console.log(`📺 Monitoring channel: ${CONFIG.discord.scheduleChannelId}`);
  console.log(`📁 GitHub target: ${CONFIG.github.owner}/${CONFIG.github.repo}`);
  console.log(`🌿 Branch: ${CONFIG.github.branch}`);
  console.log(`📄 File: ${CONFIG.github.filePath}`);
  console.log('========================================\n');
});

/**
 * Extract all text content from a message (including cross-posted/forwarded messages)
 * @param {Message} message - Discord message object
 * @returns {string} - Combined text content
 */
function extractMessageContent(message) {
  let allContent = [];
  
  // 1. Regular message content
  if (message.content && message.content.length > 0) {
    allContent.push(message.content);
  }
  
  // 2. Embeds (used by cross-posted/forwarded messages)
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (embed.title) allContent.push(embed.title);
      if (embed.description) allContent.push(embed.description);
      if (embed.fields && embed.fields.length > 0) {
        for (const field of embed.fields) {
          if (field.name) allContent.push(field.name);
          if (field.value) allContent.push(field.value);
        }
      }
      if (embed.footer && embed.footer.text) allContent.push(embed.footer.text);
    }
  }
  
  // 3. Message Snapshots (Discord Forward feature) - Access via raw API data
  if (message.messageSnapshots && message.messageSnapshots.size > 0) {
    console.log(`   📸 Found ${message.messageSnapshots.size} message snapshot(s)`);
    for (const [key, snapshot] of message.messageSnapshots) {
      console.log(`   📸 Snapshot key: ${key}`);
      console.log(`   📸 Snapshot type: ${typeof snapshot}`);
      console.log(`   📸 Snapshot keys: ${Object.keys(snapshot || {}).join(', ')}`);
      
      // Try to access the message content from snapshot
      if (snapshot) {
        // Check if snapshot has message property
        if (snapshot.message) {
          console.log(`   📸 snapshot.message keys: ${Object.keys(snapshot.message).join(', ')}`);
          if (snapshot.message.content) {
            console.log(`   📸 Found content in snapshot.message: ${snapshot.message.content.substring(0, 100)}`);
            allContent.push(snapshot.message.content);
          }
        }
        // Direct content on snapshot
        if (snapshot.content) {
          console.log(`   📸 Found direct content: ${snapshot.content.substring(0, 100)}`);
          allContent.push(snapshot.content);
        }
      }
    }
  }
  
  // 4. Access raw API data for message_snapshots (workaround for Discord.js)
  // The raw data might have the content that Discord.js doesn't expose
  try {
    // Access internal raw data if available
    if (message._edits || message.rawData) {
      console.log(`   📸 Checking _edits or rawData...`);
    }
  } catch (e) {}
  
  return allContent.join('\n');
}

client.on('messageCreate', async (message) => {
  // Only process messages from the schedule channel
  if (message.channel.id !== CONFIG.discord.scheduleChannelId) {
    return;
  }
  
  // Ignore our own bot messages
  if (message.author.id === client.user.id) {
    return;
  }
  
  // Check if this is a cross-posted message (from followed channel)
  const isCrossPost = message.flags.has('Crossposted') || 
                      message.flags.has('IsCrosspost') ||
                      message.reference?.guildId !== message.guildId;
  
  console.log(`\n📨 New message in schedule channel`);
  console.log(`   From: ${message.author.tag || 'Unknown'} (${message.author.id})`);
  console.log(`   Is CrossPost/Forwarded: ${isCrossPost}`);
  console.log(`   Has Embeds: ${message.embeds?.length || 0}`);
  console.log(`   Content length: ${message.content?.length || 0} chars`);
  console.log(`   Message type: ${message.type}`);
  console.log(`   Flags: ${message.flags.toArray().join(', ') || 'none'}`);
  
  // Debug: Log all message properties to understand structure
  console.log(`   📋 Message keys: ${Object.keys(message).join(', ')}`);
  if (message.reference) {
    console.log(`   📋 Reference: ${JSON.stringify(message.reference)}`);
  }
  
  // Log raw message data for debugging forwarded messages
  try {
    const rawMsg = message.toJSON();
    console.log(`   📋 Raw message keys: ${Object.keys(rawMsg).join(', ')}`);
    if (rawMsg.message_snapshots) {
      console.log(`   📋 message_snapshots found in raw: ${JSON.stringify(rawMsg.message_snapshots).substring(0, 500)}`);
    }
    if (rawMsg.message_reference) {
      console.log(`   📋 message_reference: ${JSON.stringify(rawMsg.message_reference)}`);
    }
  } catch (e) {
    console.log(`   ⚠️ Could not serialize message: ${e.message}`);
  }
  
  // Extract all content (including from embeds for cross-posted messages)
  const fullContent = extractMessageContent(message);
  
  console.log(`   Extracted content length: ${fullContent.length} chars`);
  console.log(`   Full content:\n${fullContent.substring(0, 500)}${fullContent.length > 500 ? '...' : ''}`);
  
  // Parse the message
  const entries = parseScheduleMessage(fullContent);
  
  if (entries.length > 0) {
    console.log(`   ✅ Parsed ${entries.length} schedule entries:`);
    entries.forEach(e => {
      console.log(`      - SQ #${e.id} | ${e.format} | ${new Date(e.time).toLocaleString()}`);
    });
    
    // Add to pending entries
    pendingScheduleEntries.push(...entries);
    console.log(`   📋 Total pending entries: ${pendingScheduleEntries.length}`);
    
    // Schedule delayed update
    scheduleGitHubUpdate();
  } else {
    console.log(`   ⚠️  No valid schedule entries found in message`);
  }
});

// Error handling
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

// Start the bot
console.log('🚀 Starting MK8DX SQ Schedule Bot...');
client.login(CONFIG.discord.token).catch((error) => {
  console.error('❌ Failed to login:', error.message);
  process.exit(1);
});
