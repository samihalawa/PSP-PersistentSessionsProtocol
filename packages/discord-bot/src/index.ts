/**
 * PSP Discord Bot - Community Engagement and Support
 * 
 * Features:
 * - Welcome messages for new members
 * - Community stats and metrics
 * - PSP status monitoring
 * - Support ticket creation
 * - Automated announcements
 * - GitHub integration notifications
 */

import { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { CronJob } from 'cron';
import { analytics } from '@psp/analytics';
import * as dotenv from 'dotenv';

dotenv.config();

interface BotConfig {
  token: string;
  clientId: string;
  guildId?: string;
  welcomeChannelId?: string;
  statusChannelId?: string;
  supportChannelId?: string;
}

class PSPDiscordBot {
  private client: Client;
  private config: BotConfig;
  private commands: Map<string, any> = new Map();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
      ]
    });

    this.config = {
      token: process.env.DISCORD_TOKEN!,
      clientId: process.env.DISCORD_CLIENT_ID!,
      guildId: process.env.DISCORD_GUILD_ID,
      welcomeChannelId: process.env.DISCORD_WELCOME_CHANNEL_ID,
      statusChannelId: process.env.DISCORD_STATUS_CHANNEL_ID,
      supportChannelId: process.env.DISCORD_SUPPORT_CHANNEL_ID
    };

    this.setupCommands();
    this.setupEventHandlers();
    this.setupCronJobs();
  }

  async start(): Promise<void> {
    try {
      console.log('🤖 Starting PSP Discord Bot...');
      
      // Register slash commands
      await this.registerCommands();
      
      // Login to Discord
      await this.client.login(this.config.token);
      
      console.log('✅ PSP Discord Bot is online!');
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  private setupCommands(): void {
    // Status command
    this.commands.set('status', {
      data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Get PSP platform status and metrics'),
      async execute(interaction: any) {
        try {
          const metrics = await analytics.getUsageMetrics();
          
          const embed = {
            color: 0x0099ff,
            title: '📊 PSP Platform Status',
            fields: [
              {
                name: '🎯 Active Sessions',
                value: metrics.activeSessions.toLocaleString(),
                inline: true
              },
              {
                name: '👥 Daily Active Users',
                value: metrics.dailyActiveUsers.toLocaleString(),
                inline: true
              },
              {
                name: '📈 API Calls Today',
                value: metrics.apiCallsPerDay.toLocaleString(),
                inline: true
              },
              {
                name: '⚡ Error Rate',
                value: `${(metrics.errorRate * 100).toFixed(2)}%`,
                inline: true
              },
              {
                name: '🏆 Top Platform',
                value: metrics.topPlatforms[0]?.platform || 'N/A',
                inline: true
              },
              {
                name: '🕒 Avg Session Duration',
                value: `${metrics.averageSessionDuration} min`,
                inline: true
              }
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: 'PSP Platform Metrics'
            }
          };

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply('❌ Failed to fetch platform status. Please try again later.');
        }
      }
    });

    // Help command
    this.commands.set('help', {
      data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with PSP'),
      async execute(interaction: any) {
        const embed = {
          color: 0x00ff00,
          title: '❓ PSP Help Center',
          description: 'Here are the available commands and resources:',
          fields: [
            {
              name: '🤖 Bot Commands',
              value: '`/status` - Platform status\n`/docs` - Documentation links\n`/support` - Get support',
              inline: false
            },
            {
              name: '📚 Documentation',
              value: '[Getting Started](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/guide/getting-started.md)\n[API Reference](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/api/)\n[Examples](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/examples/)',
              inline: false
            },
            {
              name: '🔗 Quick Links',
              value: '[GitHub Repository](https://github.com/samihalawa/PSP-PersistentSessionsProtocol)\n[Live Demo](https://samihalawa.github.io/PSP-PersistentSessionsProtocol/)\n[Community Guidelines](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/CONTRIBUTING.md)',
              inline: false
            }
          ]
        };

        await interaction.reply({ embeds: [embed] });
      }
    });

    // Documentation command
    this.commands.set('docs', {
      data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Get PSP documentation links'),
      async execute(interaction: any) {
        const embed = {
          color: 0xff9900,
          title: '📖 PSP Documentation',
          description: 'Comprehensive guides and references for PSP',
          fields: [
            {
              name: '🚀 Getting Started',
              value: '[Quick Start Guide](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/guide/getting-started.md)',
              inline: false
            },
            {
              name: '🔧 API Reference',
              value: '[Core API](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/api/core.md)\n[Server API](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/api/server.md)',
              inline: true
            },
            {
              name: '🎯 Examples',
              value: '[Basic Usage](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/examples/basic.md)\n[Advanced Patterns](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/examples/advanced.md)',
              inline: true
            },
            {
              name: '🔌 Integrations',
              value: '[Playwright](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/adapters/playwright.md)\n[Selenium](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/blob/main/docs/adapters/selenium.md)',
              inline: false
            }
          ]
        };

        await interaction.reply({ embeds: [embed] });
      }
    });

    // Support command
    this.commands.set('support', {
      data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get support for PSP issues'),
      async execute(interaction: any) {
        const embed = {
          color: 0xff0066,
          title: '🆘 PSP Support',
          description: 'Need help? Here are your options:',
          fields: [
            {
              name: '💬 Community Support',
              value: 'Ask questions in this Discord server or check existing discussions.',
              inline: false
            },
            {
              name: '🐛 Bug Reports',
              value: '[Create an issue on GitHub](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/issues/new?template=bug_report.md)',
              inline: false
            },
            {
              name: '💡 Feature Requests',
              value: '[Submit a feature request](https://github.com/samihalawa/PSP-PersistentSessionsProtocol/issues/new?template=feature_request.md)',
              inline: false
            },
            {
              name: '📧 Direct Support',
              value: 'For enterprise support, contact: support@psp-protocol.dev',
              inline: false
            }
          ]
        };

        await interaction.reply({ embeds: [embed] });
      }
    });
  }

  private setupEventHandlers(): void {
    // Bot ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      console.log(`✅ Logged in as ${readyClient.user.tag}!`);
      this.updateBotStatus();
    });

    // New member welcome
    this.client.on(Events.GuildMemberAdd, async (member) => {
      if (this.config.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(this.config.welcomeChannelId);
        if (channel && channel.isTextBased()) {
          const embed = {
            color: 0x00ff00,
            title: '🎉 Welcome to the PSP Community!',
            description: `Welcome ${member.user.toString()}! Thanks for joining the PSP (Persistent Sessions Protocol) community.`,
            fields: [
              {
                name: '🚀 Getting Started',
                value: 'Check out our [documentation](https://github.com/samihalawa/PSP-PersistentSessionsProtocol) to get started.',
                inline: false
              },
              {
                name: '💬 Need Help?',
                value: 'Use `/help` to see available commands or ask questions in our support channels.',
                inline: false
              }
            ],
            thumbnail: {
              url: member.user.displayAvatarURL()
            }
          };

          await channel.send({ embeds: [embed] });
          
          // Track new member
          await analytics.trackEvent({
            event: 'discord_member_joined',
            userId: member.user.id,
            properties: {
              username: member.user.username,
              joinedAt: new Date()
            }
          });
        }
      }
    });

    // Slash command handler
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
        
        // Track command usage
        await analytics.trackEvent({
          event: 'discord_command_used',
          userId: interaction.user.id,
          properties: {
            command: interaction.commandName,
            guildId: interaction.guildId,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Error executing command:', error);
        
        const errorReply = 'There was an error while executing this command!';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorReply, ephemeral: true });
        } else {
          await interaction.reply({ content: errorReply, ephemeral: true });
        }
      }
    });
  }

  private setupCronJobs(): void {
    // Daily status update (every day at 9 AM UTC)
    new CronJob('0 9 * * *', async () => {
      await this.sendDailyStatus();
    }, null, true, 'UTC');

    // Weekly community stats (every Monday at 10 AM UTC)
    new CronJob('0 10 * * 1', async () => {
      await this.sendWeeklyStats();
    }, null, true, 'UTC');

    // Update bot status every 5 minutes
    new CronJob('*/5 * * * *', () => {
      this.updateBotStatus();
    }, null, true, 'UTC');
  }

  private async registerCommands(): Promise<void> {
    const rest = new REST().setToken(this.config.token);
    const commandsData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());

    try {
      console.log('🔄 Registering Discord slash commands...');
      
      if (this.config.guildId) {
        // Guild-specific commands (faster for development)
        await rest.put(
          Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
          { body: commandsData }
        );
        console.log('✅ Guild commands registered successfully.');
      } else {
        // Global commands (production)
        await rest.put(
          Routes.applicationCommands(this.config.clientId),
          { body: commandsData }
        );
        console.log('✅ Global commands registered successfully.');
      }
    } catch (error) {
      console.error('❌ Failed to register commands:', error);
    }
  }

  private updateBotStatus(): void {
    const activities = [
      'Managing PSP sessions 🔄',
      'Helping developers 👨‍💻',
      'Monitoring platform status 📊',
      'Supporting the community 💬'
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    this.client.user?.setActivity(activity);
  }

  private async sendDailyStatus(): Promise<void> {
    if (!this.config.statusChannelId) return;

    const channel = this.client.channels.cache.get(this.config.statusChannelId);
    if (!channel || !channel.isTextBased()) return;

    try {
      const metrics = await analytics.getUsageMetrics();
      
      const embed = {
        color: 0x00ff00,
        title: '📊 Daily PSP Status Report',
        fields: [
          {
            name: '🎯 Active Sessions',
            value: metrics.activeSessions.toLocaleString(),
            inline: true
          },
          {
            name: '👥 Daily Active Users',
            value: metrics.dailyActiveUsers.toLocaleString(),
            inline: true
          },
          {
            name: '📈 API Calls',
            value: metrics.apiCallsPerDay.toLocaleString(),
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send daily status:', error);
    }
  }

  private async sendWeeklyStats(): Promise<void> {
    if (!this.config.statusChannelId) return;

    const channel = this.client.channels.cache.get(this.config.statusChannelId);
    if (!channel || !channel.isTextBased()) return;

    try {
      const usage = await analytics.getUsageMetrics();
      const growth = await analytics.getGrowthMetrics();
      
      const embed = {
        color: 0xff9900,
        title: '📈 Weekly PSP Growth Report',
        fields: [
          {
            name: '👥 Monthly Active Users',
            value: usage.monthlyActiveUsers.toLocaleString(),
            inline: true
          },
          {
            name: '📊 Total Sessions',
            value: usage.totalSessions.toLocaleString(),
            inline: true
          },
          {
            name: '🆕 New Signups',
            value: growth.userSignups.toLocaleString(),
            inline: true
          },
          {
            name: '🏆 Top Platforms',
            value: usage.topPlatforms.slice(0, 3).map(p => `${p.platform}: ${p.count}`).join('\n'),
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send weekly stats:', error);
    }
  }
}

// Initialize and start the bot
const bot = new PSPDiscordBot();

if (require.main === module) {
  bot.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down PSP Discord Bot...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down PSP Discord Bot...');
    process.exit(0);
  });
}

export { PSPDiscordBot };