const { getAllUsers, saveUser } = require("../data/economy/economyManager");

module.exports = async (client, guildConfig) => {
  setInterval(async () => {
    const users = await getAllUsers(guildConfig.guildId);

    for (const user of users) {
      if (!user.loan || user.loan.remaining <= 0) continue;

      const now = Date.now();
      const oneDay = 1000 * 60 * 60 * 24;

      if (now - user.loan.lastCharge < oneDay) continue;

      const dailyFine = guildConfig.economy.loan?.dailyFine || 0.02;
      const fine = Math.floor(user.loan.remaining * dailyFine);

      if (guildConfig.economy.loan?.autoDiscount) {
        const totalMoney = (user.wallet || 0) + (user.bank || 0);
        if (totalMoney >= fine) {
          // Deduzir automaticamente
          let remainingFine = fine;
          if (user.wallet >= remainingFine) {
            user.wallet -= remainingFine;
          } else {
            remainingFine -= user.wallet;
            user.wallet = 0;
            user.bank -= remainingFine;
          }
          // Não adicionar multa se descontado automaticamente
        } else {
          user.loan.remaining += fine;
        }
      } else {
        user.loan.remaining += fine;
      }

      user.loan.lastCharge = now;

      await saveUser(user.userId, user.guildId, guildConfig, user);
    }
  }, 60 * 60 * 1000); // checa a cada 1h
};
