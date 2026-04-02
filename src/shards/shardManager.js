const { ShardingManager } = require('discord.js');
require('dotenv').config();

const manager = new ShardingManager('./src/index.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto',
  respawn: true,
  shardArgs: process.argv.slice(2)
});

manager.on('shardCreate', shard => {
  console.log(`[SHARD] Shard ${shard.id} spawnada.`);
});

manager.spawn();
