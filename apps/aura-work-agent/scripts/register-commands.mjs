const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are required.");
  process.exit(1);
}

const commands = [
  {
    name: "aura",
    description: "Ask Aura Work Agent for operational help",
    type: 1,
    options: [
      {
        name: "prompt",
        description: "Question or task for Aura",
        type: 3,
        required: true,
        max_length: 1800,
      },
    ],
  },
  {
    name: "github",
    description: "Inspect or request an approved action on Aura-Core GitHub",
    type: 1,
    options: [
      {
        name: "task",
        description: "Use APPROVE WRITE: only for an intentional write",
        type: 3,
        required: true,
        max_length: 1800,
      },
    ],
  },
  {
    name: "skygrid",
    description: "Check the configured SKYGRID status endpoint",
    type: 1,
  },
];

const route = guildId
  ? `/applications/${applicationId}/guilds/${guildId}/commands`
  : `/applications/${applicationId}/commands`;

const response = await fetch(`https://discord.com/api/v10${route}`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Discord API ${response.status}: ${body}`);
  process.exit(1);
}

const registered = JSON.parse(body);
console.log(
  JSON.stringify(
    {
      ok: true,
      scope: guildId ? `guild:${guildId}` : "global",
      commands: registered.map((command) => command.name),
    },
    null,
    2,
  ),
);
