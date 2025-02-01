const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giaiptb2')
        .setDescription('Giải phương trình bậc 2 dạng ax² + bx + c = 0')
        .addNumberOption(option => option.setName('a').setDescription('Hệ số a').setRequired(true))
        .addNumberOption(option => option.setName('b').setDescription('Hệ số b').setRequired(true))
        .addNumberOption(option => option.setName('c').setDescription('Hệ số c').setRequired(true)),

    async execute(interaction) {
        const a = interaction.options.getNumber('a');
        const b = interaction.options.getNumber('b');
        const c = interaction.options.getNumber('c');

        await interaction.reply(`📌 Giải phương trình: **${a}x² + ${b}x + ${c} = 0**`);

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        await delay(1000);

        if (a === 0) {
            if (b === 0) {
                return interaction.followUp(c === 0 ? "♾️ Phương trình có vô số nghiệm" : "❌ Pé ko tìm được nghiệm");
            } else {
                return interaction.followUp(`✅ Nghiệm của phương trình: **x = ${-c / b}**`);
            }
        }

        let delta = b * b - 4 * a * c;
        await interaction.followUp(`🔍 Tính delta: **Δ = ${delta}**`);

        await delay(1000);

        if (delta < 0) {
            return interaction.followUp("❌ Delta nhỏ hơn 0 nên aiu đừng hỏi nghiệm đâu (Δ < 0)");
        } else if (delta === 0) {
            let x = -b / (2 * a);
            return interaction.followUp(`✅ Aiu ui hiếm quá, nghiệm kép nè: **x₁ = x₂ = ${x}**`);
        } else {
            let x1 = (-b + Math.sqrt(delta)) / (2 * a);
            let x2 = (-b - Math.sqrt(delta)) / (2 * a);
            return interaction.followUp(`✅ Ngon, có hai nghiệm mà ko có 2 ghệ🔮: **x₁ = ${x1}**, **x₂ = ${x2}**`);
        }
    }
};
